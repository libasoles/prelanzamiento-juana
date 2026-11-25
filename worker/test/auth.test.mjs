import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import worker from '../src/index.js';
import { makeEnv, post } from './helpers.mjs';

const users = (env) => env.DB.sqlite.prepare('SELECT email, novedades, created_at, last_login_at FROM users').all();

/** Deja en el KV un link como el que guarda /auth/request: clave = hash del token. */
const seedLink = (env, token, data) =>
  env.MAGIC_LINKS.put(`link:${createHash('sha256').update(token).digest('base64url')}`, JSON.stringify(data));

test('canjear el magic link crea al usuario con su preferencia de novedades', async () => {
  const env = makeEnv();
  await seedLink(env, 'tok1', { email: 'ana@example.com', novedades: true });

  const res = await worker.fetch(post('/auth/verify', { token: 'tok1' }), env);

  assert.equal(res.status, 200);
  const [user, ...rest] = users(env);
  assert.equal(rest.length, 0);
  assert.equal(user.email, 'ana@example.com');
  assert.equal(user.novedades, 1);
  assert.ok(user.last_login_at);
});

test('un segundo login no duplica al usuario: actualiza novedades y last_login_at', async () => {
  const env = makeEnv();
  await seedLink(env, 'tok1', { email: 'ana@example.com', novedades: true });
  await worker.fetch(post('/auth/verify', { token: 'tok1' }), env);
  const first = users(env)[0];

  env.DB.sqlite.exec("UPDATE users SET last_login_at = '2020-01-01T00:00:00.000Z'");
  await seedLink(env, 'tok2', { email: 'ana@example.com', novedades: false });
  await worker.fetch(post('/auth/verify', { token: 'tok2' }), env);

  const all = users(env);
  assert.equal(all.length, 1);
  assert.equal(all[0].novedades, 0);
  assert.equal(all[0].created_at, first.created_at);
  assert.notEqual(all[0].last_login_at, '2020-01-01T00:00:00.000Z');
});

test('un link inválido no crea usuarios', async () => {
  const env = makeEnv();
  const res = await worker.fetch(post('/auth/verify', { token: 'nunca-emitido' }), env);

  assert.equal(res.status, 401);
  assert.equal(users(env).length, 0);
});

test('el preflight CORS de /messages permite el header Authorization', async () => {
  const env = makeEnv();
  const res = await worker.fetch(new Request('https://api.juanacabrera.com.ar/messages', { method: 'OPTIONS' }), env);

  assert.equal(res.status, 204);
  assert.match(res.headers.get('access-control-allow-headers'), /authorization/i);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://juanacabrera.com.ar');
});
