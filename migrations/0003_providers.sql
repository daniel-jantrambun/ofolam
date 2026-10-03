-- Migration number: 0003
-- Several sign-in providers (Strava today, Garmin later): athletes are identified by
-- (provider, id), and sessions / OAuth states remember which provider opened them.
-- SQLite cannot change a primary key in place: rebuild the tables, keeping existing rows as Strava.

CREATE TABLE athletes_new (
  provider TEXT NOT NULL DEFAULT 'strava',
  id INTEGER NOT NULL,              -- athlete id at the provider
  firstname TEXT,
  country TEXT,
  access_token TEXT NOT NULL,       -- AES-GCM encrypted
  refresh_token TEXT NOT NULL,      -- AES-GCM encrypted
  expires_at INTEGER NOT NULL,      -- epoch seconds
  scope TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, id)
);
INSERT INTO athletes_new (provider, id, firstname, country, access_token, refresh_token, expires_at, scope, updated_at)
  SELECT 'strava', id, firstname, country, access_token, refresh_token, expires_at, scope, updated_at FROM athletes;
DROP TABLE athletes;
ALTER TABLE athletes_new RENAME TO athletes;

CREATE TABLE sessions_new (
  id_hash TEXT PRIMARY KEY,         -- SHA-256 of the session token
  provider TEXT NOT NULL DEFAULT 'strava',
  athlete_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
INSERT INTO sessions_new (id_hash, provider, athlete_id, created_at)
  SELECT id_hash, 'strava', athlete_id, created_at FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

ALTER TABLE oauth_states ADD COLUMN provider TEXT NOT NULL DEFAULT 'strava';
