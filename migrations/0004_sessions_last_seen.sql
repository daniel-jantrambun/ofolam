-- Migration number: 0004
-- Sessions record when they were last used, so abandoned ones (and the athletes they belong to)
-- can be cleaned up by the nightly cron (see worker/cleanup.ts).
ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0;
UPDATE sessions SET last_seen_at = created_at WHERE last_seen_at = 0;
