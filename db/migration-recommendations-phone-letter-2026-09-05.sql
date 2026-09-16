-- Add phone, photo_url, letter_url to recommendations (idempotent for existing D1)
-- photo_url was added in Laravel but missing in D1 prod migration; add all three
ALTER TABLE recommendations ADD COLUMN photo_url TEXT;
ALTER TABLE recommendations ADD COLUMN phone TEXT;
ALTER TABLE recommendations ADD COLUMN letter_url TEXT;
