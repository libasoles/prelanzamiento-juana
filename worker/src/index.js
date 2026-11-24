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

function cors(env, extra = {}) {
  return {
    'access-control-allow-origin': env.SITE_URL,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
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
  if (!res.ok) throw new Error(`resend ${res.status}`);
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
  return json(env, 200, { ok: true, email, novedades, session: await signSession(env, email) });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== 'POST') return json(env, 405, { error: 'metodo' });
    try {
      if (pathname === '/auth/request') return await requestLink(request, env);
      if (pathname === '/auth/verify') return await verifyLink(request, env);
    } catch (e) {
      return json(env, 500, { error: 'interno' });
    }
    return json(env, 404, { error: 'no_encontrado' });
  },
};
