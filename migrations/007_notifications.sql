-- ============================================
-- FUEGA.AI — 007_notifications.sql
-- V2: Notifications + push subscriptions
-- ADDITIVE ONLY — no drops, no deletes
-- ============================================

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    type VARCHAR(30) NOT NULL,

    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    action_url VARCHAR(500),
    content JSONB DEFAULT '{}',

    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    push_sent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT type_valid CHECK (type IN (
        'reply_post', 'reply_comment', 'spark', 'mention',
        'community_update', 'governance', 'badge_earned',
        'tip_received', 'referral'
    ))
);

-- Primary query: unread notifications for a user, newest first
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, created_at DESC) WHERE read = FALSE;

-- All notifications for a user (inbox view)
CREATE INDEX IF NOT EXISTS idx_notifications_user_all
    ON notifications(user_id, created_at DESC);

-- Push notification queue
CREATE INDEX IF NOT EXISTS idx_notifications_push_pending
    ON notifications(created_at) WHERE push_sent = FALSE;

-- Cleanup: find old read notifications
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup
    ON notifications(read_at) WHERE read = TRUE;

-- Filter by type
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
    ON notifications(user_id, type);

-- ============================================
-- 2. USER PUSH SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user
    ON user_push_subscriptions(user_id);

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON notifications
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE
    USING (user_id = current_setting('app.user_id')::uuid);

ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_select_own ON user_push_subscriptions
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY push_subs_insert_own ON user_push_subscriptions
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY push_subs_delete_own ON user_push_subscriptions
    FOR DELETE
    USING (user_id = current_setting('app.user_id')::uuid);
