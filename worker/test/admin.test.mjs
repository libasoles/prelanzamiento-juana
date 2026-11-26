import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../src/index.js';
import { makeEnv, makeSession, post } from './helpers.mjs';

const ADMIN = 'juana@example.com';
const seed = (env) => {
  const s = env.DB.sqlite;
  s.exec(`INSERT INTO users (email) VALUES ('ana@example.com'), ('beto@example.com')`);
  s.exec(`INSERT INTO messages (user_id, body, created_at) VALUES
    (1, 'primero', '2026-11-01T10:00:00.000Z'),
    (2, 'segundo', '2026-11-02T10:00:00.000Z'),
    (1, 'tercero', '2026-11-03T10:00:00.000Z')`);
};

test('un admin de la lista blanca recibe los mensajes, el más nuevo primero, con el email', async () => {
  const env = makeEnv({ ADMIN_EMAILS: `otro@example.com, ${ADMIN.toUpperCase()}` });
  seed(env);
  const res = await worker.fetch(post('/admin/messages', {}, { session: makeSession({ email: ADMIN }) }), env);

  assert.equal(res.status, 200);
  const { messages } = await res.json();
  assert.deepEqual(
    messages.map((m) => [m.email, m.body]),
    [
      ['ana@example.com', 'tercero'],
      ['beto@example.com', 'segundo'],
      ['ana@example.com', 'primero'],
    ],
  );
  assert.ok(messages[0].created_at && messages[0].id);
});

test('un usuario logueado que no está en la lista recibe 403 y ningún dato', async () => {
  const env = makeEnv({ ADMIN_EMAILS: ADMIN });
  seed(env);
  const res = await worker.fetch(post('/admin/messages', {}, { session: makeSession({ email: 'ana@example.com' }) }), env);

  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'forbidden' });
});

test('sin ADMIN_EMAILS configurado nadie entra', async () => {
  const env = makeEnv();
  seed(env);
  const res = await worker.fetch(post('/admin/messages', {}, { session: makeSession({ email: 'ana@example.com' }) }), env);
  assert.equal(res.status, 403);
});

test('sin sesión válida responde 401', async () => {
  const env = makeEnv({ ADMIN_EMAILS: ADMIN });
  for (const session of [undefined, makeSession({ email: ADMIN, secret: 'falso' }), makeSession({ email: ADMIN, exp: 1 })]) {
    const res = await worker.fetch(post('/admin/messages', {}, { session }), env);
    assert.equal(res.status, 401);
  }
});

test('devuelve como máximo 200 mensajes', async () => {
  const env = makeEnv({ ADMIN_EMAILS: ADMIN });
  env.DB.sqlite.exec(`INSERT INTO users (email) VALUES ('ana@example.com')`);
  for (let i = 0; i < 205; i++) env.DB.sqlite.prepare(`INSERT INTO messages (user_id, body) VALUES (1, ?)`).run(`m${i}`);
  const res = await worker.fetch(post('/admin/messages', {}, { session: makeSession({ email: ADMIN }) }), env);
  assert.equal((await res.json()).messages.length, 200);
});
