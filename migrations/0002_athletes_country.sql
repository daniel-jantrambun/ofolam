-- Migration number: 0002
-- Pays du profil Strava, sert à deviner la langue de l'interface
ALTER TABLE athletes ADD COLUMN country TEXT;
