-- ============================================
-- FUEGA.AI — 004_seed_data.sql
-- TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
-- Cleanup: DELETE FROM users WHERE username LIKE 'test_%' OR username = 'system';
-- Or re-run migrations from scratch on a fresh DB.

-- ============================================
-- SYSTEM USER (for platform-level actions)
-- ============================================
INSERT INTO users (id, username, password_hash, post_sparks, comment_sparks)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system',
    '$2b$12$placeholder.hash.not.for.login.000000000000000000000',
    0, 0
);

-- ============================================
-- 5 DEFAULT CATEGORIES
-- ============================================
INSERT INTO categories (id, name, description, ai_prompt) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'technology',
    'Technology, programming, gadgets, and digital culture',
    'You are a content moderator for technology discussions. Evaluate posts for:
1. Relevance to technology topics
2. No spam, self-promotion, or affiliate links
3. No harassment or personal attacks
4. Technical accuracy is encouraged but not required
5. Constructive criticism is welcome
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}'
),
(
    '10000000-0000-0000-0000-000000000002',
    'science',
    'Scientific discoveries, research, and evidence-based discussion',
    'You are a content moderator for science discussions. Evaluate posts for:
1. Relevance to scientific topics
2. No misinformation or pseudoscience presented as fact
3. Sources encouraged for claims
4. No harassment or personal attacks
5. Healthy debate is welcome
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}'
),
(
    '10000000-0000-0000-0000-000000000003',
    'arts',
    'Visual arts, music, literature, film, and creative expression',
    'You are a content moderator for arts and creative discussions. Evaluate posts for:
1. Relevance to arts and creative topics
2. No spam or low-effort content
3. No harassment or personal attacks
4. Constructive feedback on creative work
5. Credit original creators when sharing
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}'
),
(
    '10000000-0000-0000-0000-000000000004',
    'politics',
    'Political discussion, policy, and civic engagement',
    'You are a content moderator for political discussions. Evaluate posts for:
1. Relevance to political topics
2. No calls for violence or illegal activity
3. No doxxing or sharing personal information
4. No harassment or personal attacks
5. Debate is encouraged but must remain civil
6. Misinformation should be flagged, not necessarily removed
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}'
),
(
    '10000000-0000-0000-0000-000000000005',
    'general',
    'Everything else that does not fit into a specific category',
    'You are a general content moderator. Evaluate posts for:
1. No spam or self-promotion
2. No harassment, hate speech, or personal attacks
3. No illegal content
4. No doxxing or sharing personal information
5. Content should contribute to discussion
Respond with JSON: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}'
);

-- ============================================
-- TEST USERS — TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
-- Password for all test users: "TestPassword123!" (bcrypt hash below)
-- $2b$12$LJ3m6gS9Y2y8K1ZQ8Q3E4eR7vN5pM2kH9dF6wA4tC8bX1yJ0oS6Wi
INSERT INTO users (id, username, password_hash, post_sparks, comment_sparks, founder_badge_number)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'test_user_1',
    '$2b$12$LJ3m6gS9Y2y8K1ZQ8Q3E4eR7vN5pM2kH9dF6wA4tC8bX1yJ0oS6Wi',
    15, 8, 1
),
(
    '20000000-0000-0000-0000-000000000002',
    'test_user_2',
    '$2b$12$LJ3m6gS9Y2y8K1ZQ8Q3E4eR7vN5pM2kH9dF6wA4tC8bX1yJ0oS6Wi',
    5, 3, 2
),
(
    '20000000-0000-0000-0000-000000000003',
    'demo_admin',
    '$2b$12$LJ3m6gS9Y2y8K1ZQ8Q3E4eR7vN5pM2kH9dF6wA4tC8bX1yJ0oS6Wi',
    50, 25, 3
);

-- ============================================
-- TEST COMMUNITIES — TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
INSERT INTO communities (id, name, display_name, description, ai_prompt, created_by, category_id, member_count, post_count)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'test_tech',
    'Test Technology',
    'A test community for technology discussions during development.',
    'You are a content moderator for f/test_tech. This is a technology community.
Rules:
1. Posts must be about technology
2. No spam or self-promotion
3. Be respectful to other members
4. Constructive criticism is welcome
Evaluate the USER_CONTENT against these rules.
Respond with JSON only: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    3, 2
),
(
    '30000000-0000-0000-0000-000000000002',
    'demo_science',
    'Demo Science',
    'A demo community for science discussions during development.',
    'You are a content moderator for f/demo_science. This is a science community.
Rules:
1. Posts must be about science
2. Cite sources when making claims
3. No pseudoscience presented as fact
4. Be respectful in debates
Evaluate the USER_CONTENT against these rules.
Respond with JSON only: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    2, 1
);

-- ============================================
-- TEST MEMBERSHIPS — TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
INSERT INTO community_memberships (user_id, community_id, role) VALUES
('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'admin'),
('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'member'),
('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'member'),
('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'admin'),
('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'member');

-- ============================================
-- TEST POSTS — TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
INSERT INTO posts (id, community_id, author_id, title, body, post_type, sparks, douses, comment_count, is_approved)
VALUES
(
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Welcome to f/test_tech!',
    'This is the first post in our test technology community. Feel free to discuss anything tech-related here during development.',
    'text',
    5, 1, 2, TRUE
),
(
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'AI moderation is the future',
    'I think transparent AI moderation with community governance could really change how online discussions work. What do you all think?',
    'text',
    8, 0, 1, TRUE
),
(
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'New study on quantum computing',
    'A new paper from MIT shows promising results in error correction for quantum computers. This could accelerate practical quantum computing by years.',
    'text',
    3, 0, 0, TRUE
);

-- ============================================
-- TEST COMMENTS — TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
INSERT INTO comments (id, post_id, author_id, parent_id, body, depth, sparks, douses, is_approved)
VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    'Great to see the community up and running! Looking forward to the discussions here.',
    0, 2, 0, TRUE
),
(
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000001',
    'Same here! The spark/douse system is interesting.',
    1, 1, 0, TRUE
),
(
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    NULL,
    'Totally agree. Having the community write their own AI agent prompts gives users real ownership.',
    0, 3, 0, TRUE
);

-- ============================================
-- TEST MODERATION LOG — TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
INSERT INTO moderation_log (community_id, content_type, content_id, author_id, agent_level, decision, reason, ai_model, prompt_version)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'post',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'community',
    'approved',
    'Post is a welcome message relevant to the community. No rule violations detected.',
    'claude-sonnet-4',
    1
),
(
    '30000000-0000-0000-0000-000000000001',
    'post',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'community',
    'approved',
    'Post discusses AI moderation, relevant to technology. Constructive topic for discussion.',
    'claude-sonnet-4',
    1
),
(
    '30000000-0000-0000-0000-000000000002',
    'post',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    'community',
    'approved',
    'Post references a scientific study on quantum computing. Relevant to science community.',
    'claude-sonnet-4',
    1
);

-- ============================================
-- TEST AI PROMPT HISTORY — TEST_DATA - DELETE BEFORE PRODUCTION
-- ============================================
INSERT INTO ai_prompt_history (entity_type, entity_id, prompt_text, version, created_by)
VALUES
(
    'community',
    '30000000-0000-0000-0000-000000000001',
    'You are a content moderator for f/test_tech. This is a technology community.
Rules:
1. Posts must be about technology
2. No spam or self-promotion
3. Be respectful to other members
4. Constructive criticism is welcome
Evaluate the USER_CONTENT against these rules.
Respond with JSON only: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    1,
    '20000000-0000-0000-0000-000000000001'
),
(
    'community',
    '30000000-0000-0000-0000-000000000002',
    'You are a content moderator for f/demo_science. This is a science community.
Rules:
1. Posts must be about science
2. Cite sources when making claims
3. No pseudoscience presented as fact
4. Be respectful in debates
Evaluate the USER_CONTENT against these rules.
Respond with JSON only: {"decision": "approve" or "remove", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    1,
    '20000000-0000-0000-0000-000000000002'
);
