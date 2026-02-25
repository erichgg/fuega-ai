-- Migration 017: Campfire customization columns
-- Adds banner_url, theme_color, and tagline for customizable campfire hearth

ALTER TABLE campfires ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE campfires ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7);
ALTER TABLE campfires ADD COLUMN IF NOT EXISTS tagline TEXT;
