const LINK_TTL = 15 * 60; // segundos
const SESSION_TTL = 48 * 3600;
// Topes de pedidos de link (protegen la cuota de Resend y la reputación del dominio).
// Ventana fija de una hora: arranca con el primer pedido y no se extiende con los siguientes.
const RATE_WINDOW = 3600;
const EMAIL_MAX_PER_HOUR = 5;
const IP_MAX_PER_HOUR = 10; // más holgado: varias personas pueden compartir IP (wifi, datos móviles)
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

/** Valida el token de Cloudflare Turnstile. Sin secret configurado falla cerrado. */
async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET || typeof token !== 'string' || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

/**
 * Cuenta un pedido en una ventana fija de RATE_WINDOW segundos y dice si ya se pasó del tope.
 * Guarda {n, exp}: el vencimiento queda fijo desde el primer pedido (no se renueva con cada uno).
 * KV no es atómico: es un freno aproximado, suficiente contra abuso casual.
 */
async function overLimit(env, key, max) {
  const now = Math.floor(Date.now() / 1000);
  let state = null;
  try {
    state = JSON.parse(await env.MAGIC_LINKS.get(key));
  } catch {
    /* sin estado previo */
  }
  if (!state || state.exp <= now) state = { n: 0, exp: now + RATE_WINDOW };
  if (state.n >= max) return true;
  state.n += 1;
  // KV pide un vencimiento de al menos 60 s en el futuro.
  await env.MAGIC_LINKS.put(key, JSON.stringify(state), { expiration: Math.max(state.exp, now + 60) });
  return false;
}

/** Devuelve el cupo de un pedido que no llegó a mandar el mail (así un fallo del servidor no gasta intentos). */
async function refund(env, key) {
  try {
    const state = JSON.parse(await env.MAGIC_LINKS.get(key));
    if (state && state.n > 0) {
      state.n -= 1;
      await env.MAGIC_LINKS.put(key, JSON.stringify(state), { expiration: Math.max(state.exp, Math.floor(Date.now() / 1000) + 60) });
    }
  } catch {
    /* nada que devolver */
  }
}

async function sendMail(env, to, link) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${String(env.RESEND_API_KEY).trim()}`, 'content-type': 'application/json' },
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
  if (!EMAIL_RE.test(email)) return json(env, 400, { error: 'invalid_email' });
  if (!env.CODES.split(',').includes(code)) return json(env, 403, { error: 'invalid_code' });

  const ip = request.headers.get('cf-connecting-ip');
  const ipKey = ip ? `iprate:${await sha256(ip)}` : null;
  const emailKey = `rate:${await sha256(email)}`;
  if (ipKey && (await overLimit(env, ipKey, IP_MAX_PER_HOUR))) return json(env, 429, { error: 'too_many_requests' });
  if (await overLimit(env, emailKey, EMAIL_MAX_PER_HOUR)) {
    if (ipKey) await refund(env, ipKey);
    return json(env, 429, { error: 'too_many_requests' });
  }
  if (!(await verifyTurnstile(env, body.turnstile, ip))) {
    if (ipKey) await refund(env, ipKey);
    await refund(env, emailKey);
    return json(env, 400, { error: 'invalid_captcha' });
  }

  // Se guarda el hash: el token en claro solo existe en el mail.
  const token = randomToken();
  const linkKey = `link:${await sha256(token)}`;
  await env.MAGIC_LINKS.put(linkKey, JSON.stringify({ email, novedades: !!body.novedades }), { expirationTtl: LINK_TTL });
  try {
    await sendMail(env, email, `${env.SITE_URL}/palabras?token=${token}`);
  } catch (e) {
    // El mail no salió: el link no sirve y los intentos no se gastan.
    await env.MAGIC_LINKS.delete(linkKey);
    if (ipKey) await refund(env, ipKey);
    await refund(env, emailKey);
    throw e;
  }
  return json(env, 200, { ok: true });
}

async function verifyLink(request, env) {
  const { token } = await request.json().catch(() => ({}));
  if (!token) return json(env, 400, { error: 'missing_token' });
  const key = `link:${await sha256(String(token))}`;
  const raw = await env.MAGIC_LINKS.get(key);
  if (!raw) return json(env, 401, { error: 'link_expired_or_used' });
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
const MAX_PER_DAY = 3;
const DAY = 24 * 3600 * 1000;

async function saveMessage(request, env, ctx) {
  const email = await verifySession(env, request.headers.get('authorization'));
  if (!email) return json(env, 401, { error: 'invalid_session' });
  const input = await request.json().catch(() => ({}));
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body || body.length > MAX_BODY) return json(env, 400, { error: 'invalid_message' });
  // Un solo viaje a D1 (batch = una transacción): alta del usuario si falta + mensaje.
  // El mensaje sólo se inserta si el usuario no llegó al límite de la última hora;
  // changes === 0 en el segundo statement significa «límite alcanzado».
  const since = new Date(Date.now() - DAY).toISOString();
  const [, saved] = await env.DB.batch([
    env.DB.prepare('INSERT INTO users (email) VALUES (?1) ON CONFLICT (email) DO NOTHING').bind(email),
    env.DB.prepare(
      `INSERT INTO messages (user_id, body)
       SELECT id, ?2 FROM users
       WHERE email = ?1
         AND (SELECT COUNT(*) FROM messages m WHERE m.user_id = users.id AND m.created_at > ?3) < ?4`,
    ).bind(email, body, since, MAX_PER_DAY),
  ]);
  if (saved.meta.changes === 0) return json(env, 429, { error: 'too_many_messages' });
  // El aviso no demora ni rompe la respuesta: si falla, el mensaje ya está guardado.
  const notice = notifyAdmins(env, email, body).catch((e) => console.error('notify', e));
  ctx?.waitUntil?.(notice);
  return json(env, 200, { ok: true });
}

const ADMIN_LIMIT = 200;

/** Lista blanca: ADMIN_EMAILS (separada por comas, sin distinguir mayúsculas). Vacía = nadie entra. */
const adminEmails = (env) =>
  String(env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const isAdmin = (env, email) => adminEmails(env).includes(email.toLowerCase());

/** Avisa por mail a la lista blanca (ADMIN_EMAILS) que llegó un mensaje nuevo. */
async function notifyAdmins(env, from, body) {
  const to = adminEmails(env);
  if (!to.length) return;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${String(env.RESEND_API_KEY).trim()}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to,
      subject: 'Nuevo mensaje para Juana',
      text: `${from} dejó un mensaje:\n\n${body}\n\nVerlos todos: ${env.SITE_URL}/mensajes`,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status} ${await res.text()}`);
}

/** Mensajes para el panel /mensajes: sólo emails de ADMIN_EMAILS con sesión válida. */
async function listMessages(request, env) {
  const email = await verifySession(env, request.headers.get('authorization'));
  if (!email) return json(env, 401, { error: 'invalid_session' });
  if (!isAdmin(env, email)) return json(env, 403, { error: 'forbidden' });
  const { results } = await env.DB.prepare(
    `SELECT m.id, u.email, m.body, m.created_at
     FROM messages m JOIN users u ON u.id = m.user_id
     ORDER BY m.created_at DESC, m.id DESC LIMIT ?1`,
  )
    .bind(ADMIN_LIMIT)
    .all();
  return json(env, 200, { messages: results });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== 'POST') return json(env, 405, { error: 'method_not_allowed' });
    try {
      if (pathname === '/auth/request') return await requestLink(request, env);
      if (pathname === '/auth/verify') return await verifyLink(request, env);
      if (pathname === '/messages') return await saveMessage(request, env, ctx);
      if (pathname === '/admin/messages') return await listMessages(request, env);
    } catch (e) {
      console.error(e);
      return json(env, 500, { error: 'internal_error' });
    }
    return json(env, 404, { error: 'not_found' });
  },
};
