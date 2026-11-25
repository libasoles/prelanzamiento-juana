-- Usuarios que entraron con magic link y los mensajes que dejan en /palabras.
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  novedades     INTEGER NOT NULL DEFAULT 0 CHECK (novedades IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

CREATE TABLE messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Sirve al límite por hora (user_id + created_at) y a listar lo último primero.
CREATE INDEX messages_user_created_idx ON messages (user_id, created_at DESC);
CREATE INDEX messages_created_idx ON messages (created_at DESC);
