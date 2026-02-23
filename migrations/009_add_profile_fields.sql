-- ============================================
-- FUEGA.AI — 009_add_profile_fields.sql
-- Add optional profile customization fields to users table
-- All fields are optional — anonymous by default, customizable by choice
-- fuega never asks for real name, photo, phone, or email
-- ============================================

-- Profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN DEFAULT TRUE;

-- Brand (user flair)
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_text VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_style JSONB DEFAULT '{}';

-- Constraints
ALTER TABLE users ADD CONSTRAINT bio_length CHECK (length(bio) <= 500);
ALTER TABLE users ADD CONSTRAINT display_name_length CHECK (length(display_name) <= 50);
ALTER TABLE users ADD CONSTRAINT location_length CHECK (length(location) <= 100);
ALTER TABLE users ADD CONSTRAINT website_length CHECK (length(website) <= 255);
ALTER TABLE users ADD CONSTRAINT brand_text_length CHECK (length(brand_text) <= 50);

-- Rename legacy spark columns to glow (if they exist as sparks)
-- This aligns the schema with the new terminology
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'post_sparks') THEN
        ALTER TABLE users RENAME COLUMN post_sparks TO post_glow;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'comment_sparks') THEN
        ALTER TABLE users RENAME COLUMN comment_sparks TO comment_glow;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'founder_badge_number') THEN
        ALTER TABLE users RENAME COLUMN founder_badge_number TO founder_number;
    END IF;
END $$;

-- Rename sparks_positive constraint to glow_positive
ALTER TABLE users DROP CONSTRAINT IF EXISTS sparks_positive;
ALTER TABLE users ADD CONSTRAINT glow_positive CHECK (post_glow >= 0 AND comment_glow >= 0);
