import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../src/index.js';
import { makeEnv, makeSession, post } from './helpers.mjs';

const rows = (env, sql) => env.DB.sqlite.prepare(sql).all();

test('con sesión válida, POST /messages guarda al usuario y su mensaje', async () => {
  const env = makeEnv();
  const res = await worker.fetch(post('/messages', { body: 'Hola Juana' }, { session: makeSession({ email: 'ana@example.com' }) }), env);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(rows(env, 'SELECT email FROM users').map((u) => u.email), ['ana@example.com']);
  assert.deepEqual(rows(env, 'SELECT body FROM messages').map((m) => m.body), ['Hola Juana']);
});

const unauthorized = [
  ['sin Authorization', undefined],
  ['firma falsa', makeSession({ secret: 'otro-secreto' })],
  ['sesión vencida', makeSession({ exp: Date.now() - 1000 })],
  ['token sin firma', makeSession().split('.')[0]],
  ['basura', 'no-es-una-sesion'],
];

for (const [name, session] of unauthorized) {
  test(`rechaza con 401 y no guarda nada: ${name}`, async () => {
    const env = makeEnv();
    const res = await worker.fetch(post('/messages', { body: 'Hola' }, { session }), env);

    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: 'invalid_session' });
    assert.equal(rows(env, 'SELECT * FROM users').length, 0);
    assert.equal(rows(env, 'SELECT * FROM messages').length, 0);
  });
}

const invalidBodies = [
  ['vacío', ''],
  ['sólo espacios', '   \n  '],
  ['no es texto', 42],
  ['faltante', undefined],
  ['demasiado largo (2001)', 'a'.repeat(2001)],
];

for (const [name, body] of invalidBodies) {
  test(`rechaza con 400 y no guarda nada: mensaje ${name}`, async () => {
    const env = makeEnv();
    const res = await worker.fetch(post('/messages', { body }, { session: makeSession() }), env);

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'invalid_message' });
    assert.equal(rows(env, 'SELECT * FROM messages').length, 0);
  });
}

test('guarda el mensaje sin espacios de más y acepta el largo máximo (2000)', async () => {
  const env = makeEnv();
  const session = makeSession();
  await worker.fetch(post('/messages', { body: '  Hola\n' }, { session }), env);
  const max = await worker.fetch(post('/messages', { body: 'a'.repeat(2000) }, { session }), env);

  assert.equal(max.status, 200);
  assert.equal(rows(env, 'SELECT body FROM messages ORDER BY id')[0].body, 'Hola');
});

const send = (env, email, body = 'Hola') =>
  worker.fetch(post('/messages', { body }, { session: makeSession({ email }) }), env);

test('límite: el mensaje 4 de las mismas 24 horas recibe 429 y no se guarda', async () => {
  const env = makeEnv();
  for (let i = 0; i < 3; i++) assert.equal((await send(env, 'ana@example.com', `m${i}`)).status, 200);

  const res = await send(env, 'ana@example.com', 'de más');

  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: 'too_many_messages' });
  assert.equal(rows(env, 'SELECT * FROM messages').length, 3);
});

test('límite: es por usuario, y los mensajes de hace más de 24 horas no cuentan', async () => {
  const env = makeEnv();
  for (let i = 0; i < 3; i++) await send(env, 'ana@example.com');
  assert.equal((await send(env, 'beto@example.com')).status, 200);

  env.DB.sqlite.exec("UPDATE messages SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 hours')");

  assert.equal((await send(env, 'ana@example.com')).status, 200);
});

test('límite: a las 23 horas el mensaje todavía cuenta', async () => {
  const env = makeEnv();
  for (let i = 0; i < 3; i++) await send(env, 'ana@example.com');
  env.DB.sqlite.exec("UPDATE messages SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-23 hours')");

  assert.equal((await send(env, 'ana@example.com')).status, 429);
});

/** POST /messages con fetch (Resend) y waitUntil simulados; devuelve la respuesta y los mails enviados. */
async function sendCapturing(env, resendStatus) {
  const sent = [];
  const pending = [];
  const realFetch = globalThis.fetch;
  const realError = console.error;
  globalThis.fetch = async (url, init) => (sent.push({ url, body: JSON.parse(init.body) }), new Response('{}', { status: resendStatus }));
  console.error = () => {};
  try {
    const res = await worker.fetch(
      post('/messages', { body: 'Hola Juana' }, { session: makeSession({ email: 'ana@example.com' }) }),
      env,
      { waitUntil: (p) => pending.push(p) },
    );
    await Promise.all(pending);
    return { res, sent };
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
  }
}

test('avisa por mail a ADMIN_EMAILS con el mensaje y termina con el link a /mensajes', async () => {
  const env = makeEnv({ ADMIN_EMAILS: 'Admin@example.com, otra@example.com' });
  const { res, sent } = await sendCapturing(env, 200);

  assert.equal(res.status, 200);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].body.to, ['admin@example.com', 'otra@example.com']);
  assert.match(sent[0].body.text, /ana@example\.com/);
  assert.match(sent[0].body.text, /Hola Juana/);
  assert.ok(sent[0].body.text.endsWith('https://juanacabrera.com.ar/mensajes'));
});

test('sin ADMIN_EMAILS no se manda ningún aviso', async () => {
  const { res, sent } = await sendCapturing(makeEnv(), 200);

  assert.equal(res.status, 200);
  assert.equal(sent.length, 0);
});

test('si falla el aviso, el mensaje igual se guarda y responde 200', async () => {
  const env = makeEnv({ ADMIN_EMAILS: 'admin@example.com' });
  const { res } = await sendCapturing(env, 500);

  assert.equal(res.status, 200);
  assert.equal(rows(env, 'SELECT * FROM messages').length, 1);
});
