-- Add device/connection columns to visits table.
-- These capture the same data Ask Anything collects from visitors.
ALTER TABLE visits ADD COLUMN screen   TEXT;    -- e.g. "1920×1080"
ALTER TABLE visits ADD COLUMN cores    TEXT;    -- e.g. "8"
ALTER TABLE visits ADD COLUMN ram      TEXT;    -- e.g. "8GB"
ALTER TABLE visits ADD COLUMN lang     TEXT;    -- e.g. "en-US"
ALTER TABLE visits ADD COLUMN tz       TEXT;    -- e.g. "Asia/Manila"
ALTER TABLE visits ADD COLUMN conn     TEXT;    -- e.g. "4g"
ALTER TABLE visits ADD COLUMN isp      TEXT;    -- e.g. "Globe Telecom"
