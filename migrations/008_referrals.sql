-- ============================================
-- FUEGA.AI — 008_referrals.sql
-- V2: Referral tracking + user columns
-- ADDITIVE ONLY — no drops, no deletes
-- ============================================

-- ============================================
-- 1. ADD REFERRAL COLUMNS TO USERS TABLE
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- Constraints (use DO block to avoid duplicate constraint errors)
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

-- Indexes for referral columns on users
CREATE INDEX IF NOT EXISTS idx_users_referral_code
    ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by
    ON users(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referral_count
    ON users(referral_count DESC) WHERE referral_count > 0;

-- ============================================
-- 2. REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referee_id UUID NOT NULL REFERENCES users(id),

    referral_link VARCHAR(100) NOT NULL,
    ip_hash VARCHAR(64),

    reverted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(referee_id),
    CONSTRAINT no_self_referral CHECK (referrer_id != referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
    ON referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referee
    ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_link
    ON referrals(referral_link);
CREATE INDEX IF NOT EXISTS idx_referrals_ip
    ON referrals(ip_hash) WHERE ip_hash IS NOT NULL;

-- ============================================
-- 3. REFERRAL COUNT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET referral_count = referral_count + 1 WHERE id = NEW.referrer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS referrals_count_trigger ON referrals;
CREATE TRIGGER referrals_count_trigger
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_count();

-- ============================================
-- 4. RLS POLICIES
-- ============================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_select_own ON referrals
    FOR SELECT
    USING (referrer_id = current_setting('app.user_id')::uuid);
