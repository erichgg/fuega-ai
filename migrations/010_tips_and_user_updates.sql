-- ============================================
-- FUEGA.AI — 010_tips_and_user_updates.sql
-- V2: Tips table + ALTER existing tables for V2 features
-- ADDITIVE ONLY — no drops, no deletes
-- ============================================

-- ============================================
-- 1. TIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(3) DEFAULT 'usd',
    stripe_payment_id VARCHAR(100) NOT NULL,

    recurring BOOLEAN DEFAULT FALSE,
    stripe_subscription_id VARCHAR(100),

    message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT message_length CHECK (message IS NULL OR char_length(message) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_tips_user ON tips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_stripe ON tips(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_tips_created ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_recurring ON tips(user_id) WHERE recurring = TRUE;

-- ============================================
-- 2. ALTER USERS TABLE — V2 columns
-- ============================================

-- Rename founder_badge_number to founder_number for consistency with DATA_SCHEMA.md v2
-- Using ADD IF NOT EXISTS pattern since ALTER COLUMN RENAME isn't idempotent
DO $$
BEGIN
    -- Add founder_number if it doesn't exist (in case founder_badge_number exists from v1)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'founder_number'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'founder_badge_number'
        ) THEN
            ALTER TABLE users RENAME COLUMN founder_badge_number TO founder_number;
        ELSE
            ALTER TABLE users ADD COLUMN founder_number INTEGER UNIQUE;
        END IF;
    END IF;
END $$;

-- Add CHECK constraint on founder_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'founder_number_range'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT founder_number_range CHECK (founder_number >= 1 AND founder_number <= 5000);
    END IF;
END $$;

-- primary_badge: active display badge slug
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_badge VARCHAR(50);

-- cosmetics: active cosmetic selections JSONB
ALTER TABLE users ADD COLUMN IF NOT EXISTS cosmetics JSONB DEFAULT '{}';

-- notification_preferences: user notification settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

-- referral columns (may already exist from 008_referrals.sql — IF NOT EXISTS is safe)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE;

-- Constraints (safe idempotent adds)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_self_referral'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT no_self_referral CHECK (referred_by != id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'referral_count_positive'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT referral_count_positive CHECK (referral_count >= 0);
    END IF;
END $$;

-- Indexes for new user columns
CREATE INDEX IF NOT EXISTS idx_users_founder_number ON users(founder_number) WHERE founder_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_primary_badge ON users(primary_badge) WHERE primary_badge IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referral_count ON users(referral_count DESC) WHERE referral_count > 0;
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

-- ============================================
-- 3. ALTER COMMUNITIES TABLE — V2 columns
-- ============================================
ALTER TABLE communities ADD COLUMN IF NOT EXISTS ai_config JSONB NOT NULL DEFAULT '{
    "toxicity_threshold": 50,
    "spam_sensitivity": "medium",
    "self_promotion": "flag",
    "link_sharing": "allow",
    "content_types": ["text", "link", "image"],
    "language": "en",
    "min_account_age_days": 0,
    "min_spark_score": 0,
    "keyword_block_list": [],
    "keyword_flag_list": []
}'::jsonb;

ALTER TABLE communities ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}';

-- ============================================
-- 4. ALTER COMMUNITY MEMBERSHIPS — V2 columns
-- ============================================

-- Migrate V1 role values to V2 equivalents before adding constraint
UPDATE community_memberships SET role = 'founder' WHERE role = 'admin';
UPDATE community_memberships SET role = 'member' WHERE role NOT IN ('founder', 'moderator', 'vip', 'active_member', 'member', 'lurker');

-- Update role CHECK constraint to include V2 roles
-- First drop old constraint if it exists, then add new one
DO $$
BEGIN
    -- Drop existing role check if it exists (may be named differently)
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'community_memberships_role_check'
        AND conrelid = 'community_memberships'::regclass
    ) THEN
        ALTER TABLE community_memberships DROP CONSTRAINT community_memberships_role_check;
    END IF;

    -- Add V2 role constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'role_valid_v2'
    ) THEN
        ALTER TABLE community_memberships ADD CONSTRAINT role_valid_v2
            CHECK (role IN ('founder', 'moderator', 'vip', 'active_member', 'member', 'lurker'));
    END IF;
END $$;

ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES users(id);
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS post_count_in_community INTEGER DEFAULT 0;
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS comment_count_in_community INTEGER DEFAULT 0;
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS sparks_earned_in_community INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_memberships_role ON community_memberships(community_id, role);
CREATE INDEX IF NOT EXISTS idx_memberships_activity ON community_memberships(community_id, sparks_earned_in_community DESC);

-- ============================================
-- 5. ALTER AI PROMPT HISTORY — V2 columns
-- ============================================
ALTER TABLE ai_prompt_history ADD COLUMN IF NOT EXISTS ai_config JSONB NOT NULL DEFAULT '{}';

-- ============================================
-- 6. RLS POLICY FOR TIPS
-- ============================================
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY tips_select_own ON tips
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

-- ============================================
-- 7. MEMBERSHIP ACTIVITY TRIGGERS
-- ============================================

-- Track post activity per community membership
CREATE OR REPLACE FUNCTION update_membership_activity_post()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_approved = TRUE THEN
        UPDATE community_memberships
        SET post_count_in_community = post_count_in_community + 1
        WHERE user_id = NEW.author_id AND community_id = NEW.community_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_membership_activity ON posts;
CREATE TRIGGER posts_membership_activity
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_activity_post();

-- Track comment activity per community membership
CREATE OR REPLACE FUNCTION update_membership_activity_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_community_id UUID;
BEGIN
    SELECT community_id INTO v_community_id FROM posts WHERE id = NEW.post_id;
    IF NEW.is_approved = TRUE AND v_community_id IS NOT NULL THEN
        UPDATE community_memberships
        SET comment_count_in_community = comment_count_in_community + 1
        WHERE user_id = NEW.author_id AND community_id = v_community_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_membership_activity ON comments;
CREATE TRIGGER comments_membership_activity
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_activity_comment();

-- ============================================
-- 8. ADDITIONAL PERFORMANCE INDEXES
-- ============================================

-- Notification inbox (critical for V2)
CREATE INDEX IF NOT EXISTS idx_notifications_inbox ON notifications(user_id, read, created_at DESC);

-- Badge eligibility checks
CREATE INDEX IF NOT EXISTS idx_user_badges_eligibility ON user_badges(user_id, badge_id);

-- Referral leaderboard
CREATE INDEX IF NOT EXISTS idx_users_referral_leaderboard ON users(referral_count DESC)
    WHERE referral_count > 0 AND deleted_at IS NULL;

-- Cosmetic shop browsing
CREATE INDEX IF NOT EXISTS idx_cosmetics_shop ON cosmetics(category, subcategory, sort_order)
    WHERE available = TRUE;
