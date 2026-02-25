-- ============================================
-- FUEGA.AI — 018_missing_columns.sql
-- Add missing columns referenced by services
-- These columns are used in code but were never added to the schema
-- ============================================

-- 1. users.primary_badge (referenced in badges.service.ts setPrimaryBadge)
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_badge UUID REFERENCES badges(id) ON DELETE SET NULL;

-- 2. users.notification_preferences (referenced in notifications.service.ts)
-- JSONB to store per-type preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

-- 3. campfire_members.left_at (referenced in badge-eligibility.ts)
ALTER TABLE campfire_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

-- 4. campfire_mod_logs.injection_detected (referenced in moderation.service.ts)
ALTER TABLE campfire_mod_logs ADD COLUMN IF NOT EXISTS injection_detected BOOLEAN DEFAULT FALSE;

-- 5. Index for primary_badge lookups
CREATE INDEX IF NOT EXISTS idx_users_primary_badge ON users(primary_badge) WHERE primary_badge IS NOT NULL;
