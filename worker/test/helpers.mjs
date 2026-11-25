import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export const SECRET = 'secreto-de-test';
export const SITE_URL = 'https://juanacabrera.com.ar';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** Sesión firmada igual que la emite el Worker: base64url(payload).HMAC-SHA256. */
export function makeSession({ email = 'ana@example.com', exp = Date.now() + 86_400_000, secret = SECRET } = {}) {
  const payload = b64url(JSON.stringify({ email, exp }));
  return `${payload}.${b64url(createHmac('sha256', secret).update(payload).digest())}`;
}

/** D1 de prueba: SQLite real en memoria con la migración real, expuesto con la forma de la API de D1. */
export function makeD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(readFileSync(new URL('../migrations/0001_users_messages.sql', import.meta.url), 'utf8'));

  const statement = (sql, values = []) => ({
    bind: (...v) => statement(sql, v),
    run: async () => {
      const r = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
    first: async () => sqlite.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
  });

  return {
    sqlite,
    prepare: (sql) => statement(sql),
    // D1 ejecuta el batch como una transacción.
    batch: async (statements) => {
      sqlite.exec('BEGIN');
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

/** KV de prueba en memoria (sólo lo que usa el Worker). */
export function makeKV() {
  const store = new Map();
  return {
    store,
    get: async (k) => store.get(k) ?? null,
    put: async (k, v) => void store.set(k, v),
    delete: async (k) => void store.delete(k),
  };
}

export function makeEnv(overrides = {}) {
  const DB = makeD1();
  return {
    DB,
    MAGIC_LINKS: makeKV(),
    SESSION_SECRET: SECRET,
    SITE_URL,
    MAIL_FROM: 'Juana <palabras@juanacabrera.com.ar>',
    CODES: 'JUANA,PALAB',
    RESEND_API_KEY: 'x',
    TURNSTILE_SECRET: 'secret-de-test',
    ...overrides,
  };
}

export function post(path, body, { session, headers = {} } = {}) {
  return new Request(`https://api.juanacabrera.com.ar${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(session ? { authorization: `Bearer ${session}` } : {}), ...headers },
    body: JSON.stringify(body),
  });
}
