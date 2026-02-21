-- ============================================
-- FUEGA.AI — 001_initial_schema.sql
-- All 13 tables + updated_at trigger function
-- ============================================

-- updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. CATEGORIES (no FK deps)
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Category-level AI agent
    ai_prompt TEXT NOT NULL,
    ai_prompt_version INTEGER DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT category_name_format CHECK (name ~ '^[a-z0-9_]+$')
);

-- ============================================
-- 2. USERS (self-ref banned_by)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt with salt rounds = 12

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMPTZ,
    banned_by UUID REFERENCES users(id),

    -- Spark score (reputation)
    post_sparks INTEGER DEFAULT 0,
    comment_sparks INTEGER DEFAULT 0,

    -- Founder badge
    founder_badge_number INTEGER UNIQUE, -- 1-5000, null for non-founders

    -- Privacy
    ip_address_hash VARCHAR(64), -- SHA-256 hash, for spam prevention
    ip_last_seen TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT sparks_positive CHECK (post_sparks >= 0 AND comment_sparks >= 0)
);

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 3. COMMUNITIES (refs users, categories)
-- ============================================
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,           -- e.g., "technology"
    display_name VARCHAR(100) NOT NULL,          -- e.g., "Technology Discussion"
    description TEXT NOT NULL,

    -- AI Moderation
    ai_prompt TEXT NOT NULL,                     -- The active moderation prompt
    ai_prompt_version INTEGER DEFAULT 1,

    -- Governance settings (JSON for flexibility)
    governance_config JSONB DEFAULT '{
        "voting_type": "simple_majority",
        "quorum_percentage": 10,
        "proposal_discussion_hours": 48,
        "proposal_voting_hours": 168,
        "spark_required_to_post": 0,
        "spark_required_to_vote": 0,
        "account_age_required_days": 0
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),

    -- Stats
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,

    -- Moderation
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    CONSTRAINT name_format CHECK (name ~ '^[a-z0-9_]+$'),
    CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50)
);

CREATE TRIGGER set_communities_updated_at
    BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 4. COMMUNITY MEMBERSHIPS (refs users, communities)
-- ============================================
CREATE TABLE community_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    -- Role
    role VARCHAR(20) DEFAULT 'member', -- member, moderator, admin

    UNIQUE(user_id, community_id)
);

-- ============================================
-- 5. POSTS (refs communities, users)
-- ============================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    author_id UUID NOT NULL REFERENCES users(id),

    -- Content
    title VARCHAR(300) NOT NULL,
    body TEXT,                     -- Null for link/image posts
    post_type VARCHAR(10) NOT NULL, -- text, link, image
    url TEXT,                      -- For link posts
    image_url TEXT,                -- For image posts (CDN URL)

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,

    -- Engagement
    sparks INTEGER DEFAULT 0,
    douses INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,

    -- Moderation
    is_approved BOOLEAN DEFAULT FALSE,
    is_removed BOOLEAN DEFAULT FALSE,
    removal_reason TEXT,
    moderated_at TIMESTAMPTZ,
    moderated_by_agent VARCHAR(50), -- community, category, or platform

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    CONSTRAINT post_type_valid CHECK (post_type IN ('text', 'link', 'image')),
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 300),
    CONSTRAINT body_length CHECK (body IS NULL OR char_length(body) <= 40000),
    CONSTRAINT votes_positive CHECK (sparks >= 0 AND douses >= 0)
);

CREATE TRIGGER set_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 6. COMMENTS (refs posts, users, self-ref parent)
-- ============================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id),
    author_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES comments(id), -- NULL for top-level comments

    -- Content
    body TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    depth INTEGER DEFAULT 0, -- 0 = top-level, increases with nesting

    -- Engagement
    sparks INTEGER DEFAULT 0,
    douses INTEGER DEFAULT 0,

    -- Moderation
    is_approved BOOLEAN DEFAULT FALSE,
    is_removed BOOLEAN DEFAULT FALSE,
    removal_reason TEXT,
    moderated_at TIMESTAMPTZ,
    moderated_by_agent VARCHAR(50),

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    CONSTRAINT comment_body_length CHECK (char_length(body) >= 1 AND char_length(body) <= 10000),
    CONSTRAINT depth_reasonable CHECK (depth >= 0 AND depth < 100),
    CONSTRAINT comment_votes_positive CHECK (sparks >= 0 AND douses >= 0)
);

CREATE TRIGGER set_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 7. VOTES (refs users, polymorphic votable)
-- ============================================
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    votable_type VARCHAR(10) NOT NULL,  -- post or comment
    votable_id UUID NOT NULL,           -- post_id or comment_id
    vote_value SMALLINT NOT NULL,       -- 1 (spark) or -1 (douse)
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Anonymization (hash user_id after 24hrs for privacy)
    anonymized BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, votable_type, votable_id),
    CONSTRAINT vote_value_valid CHECK (vote_value IN (-1, 1)),
    CONSTRAINT votable_type_valid CHECK (votable_type IN ('post', 'comment'))
);

-- ============================================
-- 8. PROPOSALS (refs communities, users)
-- ============================================
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),

    -- Proposal details
    proposal_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- What changes
    proposed_changes JSONB NOT NULL,

    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),

    discussion_ends_at TIMESTAMPTZ NOT NULL,
    voting_ends_at TIMESTAMPTZ NOT NULL,

    status VARCHAR(20) DEFAULT 'discussion',

    -- Results
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,

    implemented_at TIMESTAMPTZ,

    CONSTRAINT proposal_type_valid CHECK (proposal_type IN (
        'modify_prompt', 'addendum_prompt', 'change_settings', 'elect_council',
        'remove_moderator', 'amend_rules', 'change_category'
    )),
    CONSTRAINT proposal_status_valid CHECK (status IN (
        'discussion', 'voting', 'passed', 'failed', 'implemented'
    ))
);

CREATE TRIGGER set_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- 9. PROPOSAL VOTES (refs proposals, users)
-- ============================================
CREATE TABLE proposal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id),
    user_id UUID NOT NULL REFERENCES users(id),

    vote VARCHAR(10) NOT NULL, -- for, against, abstain
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(proposal_id, user_id),
    CONSTRAINT proposal_vote_valid CHECK (vote IN ('for', 'against', 'abstain'))
);

-- ============================================
-- 10. MODERATION LOG (refs communities, users)
--     appeal_id FK added after moderation_appeals exists
-- ============================================
CREATE TABLE moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was moderated
    content_type VARCHAR(10) NOT NULL,  -- post or comment
    content_id UUID NOT NULL,
    community_id UUID NOT NULL REFERENCES communities(id),

    -- Who authored it
    author_id UUID NOT NULL REFERENCES users(id),

    -- Decision
    agent_level VARCHAR(20) NOT NULL,   -- community, category, platform
    decision VARCHAR(20) NOT NULL,      -- approved, removed, flagged, warned
    reason TEXT NOT NULL,               -- AI-generated explanation

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ai_model VARCHAR(50),              -- e.g., "claude-sonnet-4"
    prompt_version INTEGER,

    -- Appeal (FK added below after moderation_appeals table)
    appealed BOOLEAN DEFAULT FALSE,
    appeal_id UUID,

    CONSTRAINT modlog_content_type_valid CHECK (content_type IN ('post', 'comment')),
    CONSTRAINT agent_level_valid CHECK (agent_level IN ('community', 'category', 'platform')),
    CONSTRAINT decision_valid CHECK (decision IN ('approved', 'removed', 'flagged', 'warned'))
);

-- ============================================
-- 11. MODERATION APPEALS (refs moderation_log, users)
-- ============================================
CREATE TABLE moderation_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderation_log_id UUID NOT NULL REFERENCES moderation_log(id),

    appellant_id UUID NOT NULL REFERENCES users(id),
    appeal_text TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Resolution
    status VARCHAR(20) DEFAULT 'pending',
    resolved_at TIMESTAMPTZ,
    resolution_reason TEXT,
    resolved_by_agent VARCHAR(20), -- category or platform

    CONSTRAINT appeal_length CHECK (char_length(appeal_text) <= 500),
    CONSTRAINT appeal_status_valid CHECK (status IN ('pending', 'upheld', 'overturned'))
);

-- Now add the FK from moderation_log -> moderation_appeals
ALTER TABLE moderation_log
    ADD CONSTRAINT fk_moderation_log_appeal
    FOREIGN KEY (appeal_id) REFERENCES moderation_appeals(id);

-- ============================================
-- 12. AI PROMPT HISTORY (refs users, proposals)
-- ============================================
CREATE TABLE ai_prompt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL,  -- community, category, platform
    entity_id UUID,                    -- community_id or category_id (NULL for platform)

    prompt_text TEXT NOT NULL,
    version INTEGER NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id), -- NULL for platform changes

    -- For governance
    proposal_id UUID REFERENCES proposals(id),

    CONSTRAINT entity_type_valid CHECK (entity_type IN ('community', 'category', 'platform'))
);

-- ============================================
-- 13. COUNCIL MEMBERS (refs categories, communities, users)
-- ============================================
CREATE TABLE council_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    user_id UUID NOT NULL REFERENCES users(id),

    term_start TIMESTAMPTZ DEFAULT NOW(),
    term_end TIMESTAMPTZ NOT NULL,

    is_active BOOLEAN DEFAULT TRUE
);

-- Partial unique index (PostgreSQL doesn't support WHERE on UNIQUE constraints)
CREATE UNIQUE INDEX unique_active_council
    ON council_members(category_id, community_id)
    WHERE is_active = TRUE;
