const LINK_TTL = 15 * 60; // segundos
const SESSION_TTL = 30 * 24 * 3600;
const RATE_TTL = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const enc = new TextEncoder();
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));

async function sha256(text) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

async function signSession(env, email) {
  const payload = b64url(enc.encode(JSON.stringify({ email, exp: Date.now() + SESSION_TTL * 1000 })));
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}

const fromB64url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** Devuelve el email de la sesión si la firma y el vencimiento son válidos; si no, null. */
async function verifySession(env, header) {
  try {
    const [payload, signature, ...extra] = String(header || '').replace(/^Bearer /, '').split('.');
    if (!payload || !signature || extra.length) return null;
    const key = await crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    // verify compara en tiempo constante.
    if (!(await crypto.subtle.verify('HMAC', key, fromB64url(signature), enc.encode(payload)))) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return typeof data.email === 'string' && typeof data.exp === 'number' && data.exp > Date.now() ? data.email : null;
  } catch {
    return null;
  }
}

function cors(env, extra = {}) {
  return {
    'access-control-allow-origin': env.SITE_URL,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    vary: 'origin',
    ...extra,
  };
}

const json = (env, status, body) =>
  new Response(JSON.stringify(body), { status, headers: cors(env, { 'content-type': 'application/json' }) });

async function sendMail(env, to, link) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to,
      subject: 'Tu link para entrar a Palabras',
      text: `Entrá a Palabras con este link (vence en 15 minutos y sirve una sola vez):\n\n${link}\n\nSi no lo pediste vos, ignorá este mail.`,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status} ${await res.text()}`);
}

async function requestLink(request, env) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim().toUpperCase();
  if (!EMAIL_RE.test(email)) return json(env, 400, { error: 'email_invalido' });
  if (!env.CODES.split(',').includes(code)) return json(env, 403, { error: 'codigo_invalido' });

  const emailKey = await sha256(email);
  if (await env.MAGIC_LINKS.get(`rate:${emailKey}`)) return json(env, 429, { error: 'espera_un_minuto' });
  await env.MAGIC_LINKS.put(`rate:${emailKey}`, '1', { expirationTtl: RATE_TTL });

  // Se guarda el hash: el token en claro solo existe en el mail.
  const token = randomToken();
  await env.MAGIC_LINKS.put(`link:${await sha256(token)}`, JSON.stringify({ email, novedades: !!body.novedades }), {
    expirationTtl: LINK_TTL,
  });
  await sendMail(env, email, `${env.SITE_URL}/palabras?token=${token}`);
  return json(env, 200, { ok: true });
}

async function verifyLink(request, env) {
  const { token } = await request.json().catch(() => ({}));
  if (!token) return json(env, 400, { error: 'token_faltante' });
  const key = `link:${await sha256(String(token))}`;
  const raw = await env.MAGIC_LINKS.get(key);
  if (!raw) return json(env, 401, { error: 'link_vencido_o_usado' });
  await env.MAGIC_LINKS.delete(key); // un solo uso
  const { email, novedades } = JSON.parse(raw);
  // Alta/actualización en la lista de usuarios. Si D1 falla no se corta el login (el link ya se gastó):
  // /messages vuelve a dar de alta al usuario cuando escriba.
  try {
    await env.DB.prepare(
      `INSERT INTO users (email, novedades, last_login_at) VALUES (?1, ?2, ?3)
       ON CONFLICT (email) DO UPDATE SET novedades = excluded.novedades, last_login_at = excluded.last_login_at`,
    )
      .bind(email, novedades ? 1 : 0, new Date().toISOString())
      .run();
  } catch (e) {
    console.error('users upsert', e);
  }
  return json(env, 200, { ok: true, email, novedades, session: await signSession(env, email) });
}

const MAX_BODY = 2000;
const MAX_PER_HOUR = 10;

async function saveMessage(request, env) {
  const email = await verifySession(env, request.headers.get('authorization'));
  if (!email) return json(env, 401, { error: 'sesion_invalida' });
  const input = await request.json().catch(() => ({}));
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body || body.length > MAX_BODY) return json(env, 400, { error: 'mensaje_invalido' });
  // Un solo viaje a D1 (batch = una transacción): alta del usuario si falta + mensaje.
  // El mensaje sólo se inserta si el usuario no llegó al límite de la última hora;
  // changes === 0 en el segundo statement significa «límite alcanzado».
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const [, saved] = await env.DB.batch([
    env.DB.prepare('INSERT INTO users (email) VALUES (?1) ON CONFLICT (email) DO NOTHING').bind(email),
    env.DB.prepare(
      `INSERT INTO messages (user_id, body)
       SELECT id, ?2 FROM users
       WHERE email = ?1
         AND (SELECT COUNT(*) FROM messages m WHERE m.user_id = users.id AND m.created_at > ?3) < ?4`,
    ).bind(email, body, since, MAX_PER_HOUR),
  ]);
  if (saved.meta.changes === 0) return json(env, 429, { error: 'demasiados_mensajes' });
  return json(env, 200, { ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== 'POST') return json(env, 405, { error: 'metodo' });
    try {
      if (pathname === '/auth/request') return await requestLink(request, env);
      if (pathname === '/auth/verify') return await verifyLink(request, env);
      if (pathname === '/messages') return await saveMessage(request, env);
    } catch (e) {
      console.error(e);
      return json(env, 500, { error: 'interno' });
    }
    return json(env, 404, { error: 'no_encontrado' });
  },
};
