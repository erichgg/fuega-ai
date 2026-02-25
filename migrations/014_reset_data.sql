-- ============================================
-- FUEGA.AI — 014_reset_data.sql
-- Nuke all test/user data and re-seed defaults.
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
-- DEFAULT CAMPFIRES (fresh start, no test users)
-- ============================================
INSERT INTO campfires (id, name, display_name, description, ai_prompt, created_by, member_count, post_count)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'meta',
    'Meta',
    'Discuss fuega.ai itself — feature requests, bug reports, and platform feedback.',
    'You are the AI moderator for f/meta. This campfire is for discussing the fuega.ai platform.
Rules:
1. Stay on topic — discussion about fuega.ai features, bugs, and feedback
2. Be constructive — criticism is welcome, hostility is not
3. No spam or self-promotion
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    '00000000-0000-0000-0000-000000000001',
    0, 0
),
(
    '30000000-0000-0000-0000-000000000002',
    'general',
    'General',
    'Talk about anything. The campfire for everything that doesn''t fit elsewhere.',
    'You are the AI moderator for f/general. This is an open-topic campfire.
Rules:
1. No spam or self-promotion
2. Be respectful to other members
3. No harassment or personal attacks
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    '00000000-0000-0000-0000-000000000001',
    0, 0
),
(
    '30000000-0000-0000-0000-000000000003',
    'tech',
    'Technology',
    'Technology, programming, gadgets, and digital culture.',
    'You are the AI moderator for f/tech. This campfire is for technology discussions.
Rules:
1. Posts must be related to technology
2. No spam or self-promotion
3. Be respectful in debates
4. Constructive criticism is welcome
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    '00000000-0000-0000-0000-000000000001',
    0, 0
),
(
    '30000000-0000-0000-0000-000000000004',
    'gaming',
    'Gaming',
    'Video games, board games, tabletop RPGs — all gaming welcome.',
    'You are the AI moderator for f/gaming. This campfire is for gaming discussions.
Rules:
1. Posts must be related to gaming
2. No spam or self-promotion
3. Spoilers must be marked
4. Be respectful to other gamers
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    '00000000-0000-0000-0000-000000000001',
    0, 0
),
(
    '30000000-0000-0000-0000-000000000005',
    'science',
    'Science',
    'Scientific discoveries, research, and evidence-based discussion.',
    'You are the AI moderator for f/science. This campfire is for science discussions.
Rules:
1. Posts must be related to science
2. Cite sources when making claims
3. No pseudoscience presented as fact
4. Be respectful in debates
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    '00000000-0000-0000-0000-000000000001',
    0, 0
);
