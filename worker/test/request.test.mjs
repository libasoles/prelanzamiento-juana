import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import worker from '../src/index.js';
import { makeEnv, post } from './helpers.mjs';

const realFetch = globalThis.fetch;
let calls;

/** Simula Turnstile (acepta el token 'ok') y Resend; registra los mails enviados. */
beforeEach(() => {
  calls = { mails: [], siteverify: [] };
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('siteverify')) {
      calls.siteverify.push(init.body);
      return Response.json({ success: init.body.get('response') === 'ok' });
    }
    if (String(url).includes('api.resend.com')) {
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

test('límite por IP: el pedido 6 de la misma IP recibe 429; otra IP no se ve afectada', async () => {
  const env = makeEnv();
  for (let i = 0; i < 5; i++) assert.equal((await ask(env, { email: `u${i}@example.com` })).status, 200);

  const res = await ask(env, { email: 'u9@example.com' });
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: 'demasiados_pedidos' });
  assert.equal(calls.mails.length, 5);

  assert.equal((await ask(env, { email: 'u9@example.com' }, '9.9.9.9')).status, 200);
});

test('código inválido se rechaza antes de gastar captcha o cupo de IP', async () => {
  const res = await ask(makeEnv(), { code: 'NOPE' });

  assert.equal(res.status, 403);
  assert.equal(calls.siteverify.length, 0);
});
