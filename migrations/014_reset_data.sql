-- ============================================
-- FUEGA.AI — 014_reset_data.sql
-- Nuke all test/user data. Fresh start.
-- Run this AFTER 011-013 have been applied.
-- ============================================

-- Order matters — FK dependencies
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE campfire_settings_history CASCADE;
TRUNCATE TABLE campfire_settings CASCADE;
TRUNCATE TABLE user_badges CASCADE;
TRUNCATE TABLE referrals CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE user_push_subscriptions CASCADE;
TRUNCATE TABLE proposal_votes CASCADE;
TRUNCATE TABLE proposals CASCADE;
TRUNCATE TABLE moderation_appeals CASCADE;
TRUNCATE TABLE campfire_mod_logs CASCADE;
TRUNCATE TABLE ai_prompt_history CASCADE;
TRUNCATE TABLE votes CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE campfire_members CASCADE;
TRUNCATE TABLE council_members CASCADE;
TRUNCATE TABLE campfires CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE users CASCADE;

-- ============================================
-- SYSTEM USER (for platform-level actions)
-- ============================================
INSERT INTO users (id, username, password_hash, post_glow, comment_glow)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system',
    '$2b$12$placeholder.hash.not.for.login.000000000000000000000',
    0, 0
);

-- ============================================
-- NO CAMPFIRES — users create everything
-- ============================================
