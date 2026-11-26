import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import worker from '../src/index.js';
import { makeEnv, post } from './helpers.mjs';

const realFetch = globalThis.fetch;
let calls;

/** Simula Turnstile (acepta el token 'ok') y Resend; registra los mails enviados. */
beforeEach(() => {
  calls = { mails: [], siteverify: [], resendFails: false };
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('siteverify')) {
      calls.siteverify.push(init.body);
      return Response.json({ success: init.body.get('response') === 'ok' });
    }
    if (String(url).includes('api.resend.com')) {
      if (calls.resendFails) return new Response('boom', { status: 403 });
      calls.mails.push(JSON.parse(init.body));
      return Response.json({ id: '1' });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const ask = (env, over = {}, ip = '1.2.3.4') =>
  worker.fetch(
    post('/auth/request', { email: 'ana@example.com', code: 'JUANA', turnstile: 'ok', ...over }, { headers: { 'cf-connecting-ip': ip } }),
    env,
  );

test('con captcha válido manda el mail y valida el token con la IP', async () => {
  const res = await ask(makeEnv());

  assert.equal(res.status, 200);
  assert.equal(calls.mails.length, 1);
  assert.equal(calls.siteverify[0].get('remoteip'), '1.2.3.4');
  assert.equal(calls.siteverify[0].get('secret'), 'secret-de-test');
});

for (const [name, turnstile] of [['falso', 'malo'], ['faltante', undefined], ['no es texto', 42]]) {
  test(`captcha ${name}: 400 y no manda mail`, async () => {
    const res = await ask(makeEnv(), { turnstile });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'captcha_invalido' });
    assert.equal(calls.mails.length, 0);
  });
}

test('sin TURNSTILE_SECRET configurado falla cerrado', async () => {
  const res = await ask(makeEnv({ TURNSTILE_SECRET: undefined }));

  assert.equal(res.status, 400);
  assert.equal(calls.mails.length, 0);
});

test('límite por IP: el pedido 11 de la misma IP recibe 429; otra IP no se ve afectada', async () => {
  const env = makeEnv();
  for (let i = 0; i < 10; i++) assert.equal((await ask(env, { email: `u${i}@example.com` })).status, 200);

  const res = await ask(env, { email: 'u99@example.com' });
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: 'demasiados_pedidos' });
  assert.equal(calls.mails.length, 10);

  assert.equal((await ask(env, { email: 'u99@example.com' }, '9.9.9.9')).status, 200);
});

test('límite por email: se puede pedir 5 veces seguidas sin esperar; la 6.ª recibe 429', async () => {
  const env = makeEnv();
  for (let i = 0; i < 5; i++) assert.equal((await ask(env)).status, 200);

  const res = await ask(env);
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: 'demasiados_pedidos' });
  assert.equal(calls.mails.length, 5);
  // Otro email desde la misma IP sí puede.
  assert.equal((await ask(env, { email: 'beto@example.com' })).status, 200);
});

test('la ventana es fija: pasada una hora del primer pedido se vuelve a poder', async () => {
  const env = makeEnv();
  for (let i = 0; i < 5; i++) await ask(env);
  assert.equal((await ask(env)).status, 429);

  const realNow = Date.now;
  Date.now = () => realNow() + 3601 * 1000;
  try {
    assert.equal((await ask(env)).status, 200);
  } finally {
    Date.now = realNow;
  }
});

test('un pedido bloqueado no renueva la ventana', async () => {
  const env = makeEnv();
  for (let i = 0; i < 5; i++) await ask(env);
  const key = [...env.MAGIC_LINKS.store.keys()].find((k) => k.startsWith('rate:'));
  const before = JSON.parse(env.MAGIC_LINKS.store.get(key)).exp;

  await ask(env);

  assert.equal(JSON.parse(env.MAGIC_LINKS.store.get(key)).exp, before);
});

test('si Resend falla: 500, no queda link válido y no se gastan intentos', async () => {
  const env = makeEnv();
  calls.resendFails = true;
  for (let i = 0; i < 6; i++) assert.equal((await ask(env)).status, 500);
  assert.equal([...env.MAGIC_LINKS.store.keys()].filter((k) => k.startsWith('link:')).length, 0);

  calls.resendFails = false;
  for (let i = 0; i < 5; i++) assert.equal((await ask(env)).status, 200);
});

test('un captcha inválido no gasta intentos', async () => {
  const env = makeEnv();
  for (let i = 0; i < 6; i++) assert.equal((await ask(env, { turnstile: 'malo' })).status, 400);

  for (let i = 0; i < 5; i++) assert.equal((await ask(env)).status, 200);
});

test('código inválido se rechaza antes de gastar captcha o cupo de IP', async () => {
  const res = await ask(makeEnv(), { code: 'NOPE' });

  assert.equal(res.status, 403);
  assert.equal(calls.siteverify.length, 0);
});
