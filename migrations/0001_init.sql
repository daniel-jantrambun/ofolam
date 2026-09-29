-- Migration number: 0001
CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY,           -- id athlète Strava
  firstname TEXT,
  access_token TEXT NOT NULL,       -- chiffré AES-GCM
  refresh_token TEXT NOT NULL,      -- chiffré AES-GCM
  expires_at INTEGER NOT NULL,      -- epoch secondes
  scope TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,         -- SHA-256 du token de session
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

-- Pont OAuth <-> PWA : le state généré par la PWA sert à récupérer la session,
-- sans dépendre d'un cookie (cf. navigateur intégré iOS en mode standalone)
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  session_token TEXT,
  created_at INTEGER NOT NULL
);
