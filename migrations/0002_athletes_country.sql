-- Migration number: 0002
-- Country of the Strava profile, used to guess the UI language
ALTER TABLE athletes ADD COLUMN country TEXT;
