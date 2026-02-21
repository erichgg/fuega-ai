-- ============================================
-- FUEGA.AI — 003_indexes.sql
-- Performance indexes for common queries
-- ============================================
-- Note: Inline indexes on PRIMARY KEY, UNIQUE, and simple columns
-- were created in 001_initial_schema.sql. This file adds composite
-- and partial indexes for query performance.

-- ============================================
-- USERS
-- ============================================
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_founder_badge ON users(founder_badge_number) WHERE founder_badge_number IS NOT NULL;
CREATE INDEX idx_users_ip_hash ON users(ip_address_hash) WHERE ip_address_hash IS NOT NULL;

-- ============================================
-- COMMUNITIES
-- ============================================
CREATE INDEX idx_communities_name ON communities(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_communities_category ON communities(category_id);
CREATE INDEX idx_communities_created_at ON communities(created_at);
CREATE INDEX idx_communities_member_count ON communities(member_count DESC);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE INDEX idx_categories_name ON categories(name);

-- ============================================
-- COMMUNITY MEMBERSHIPS
-- ============================================
CREATE INDEX idx_memberships_user ON community_memberships(user_id);
CREATE INDEX idx_memberships_community ON community_memberships(community_id);
CREATE INDEX idx_memberships_joined ON community_memberships(joined_at);

-- ============================================
-- POSTS — Hot feed (most critical query)
-- ============================================
-- Hot posts: score DESC, recency DESC (global feed)
CREATE INDEX idx_posts_hot_score ON posts (
    (sparks - douses) DESC,
    created_at DESC
) WHERE is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL;

-- New posts (global)
CREATE INDEX idx_posts_new ON posts (
    created_at DESC
) WHERE is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL;

-- Community hot posts
CREATE INDEX idx_posts_community_hot ON posts (
    community_id,
    (sparks - douses) DESC,
    created_at DESC
) WHERE is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL;

-- Community new posts
CREATE INDEX idx_posts_community ON posts(community_id) WHERE deleted_at IS NULL AND is_removed = FALSE;

-- Author's posts
CREATE INDEX idx_posts_author ON posts(author_id, created_at DESC);

-- Moderation queue (unmoderated posts)
CREATE INDEX idx_posts_moderation ON posts(is_approved, moderated_at) WHERE is_approved = FALSE;

-- ============================================
-- COMMENTS — Threading
-- ============================================
-- Comment threading: fetch all comments for a post, ordered
CREATE INDEX idx_comments_thread ON comments (
    post_id,
    parent_id,
    created_at ASC
) WHERE is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL;

-- Post comments (simple lookup)
CREATE INDEX idx_comments_post ON comments(post_id) WHERE deleted_at IS NULL AND is_removed = FALSE;

-- Author's comments
CREATE INDEX idx_comments_author ON comments(author_id);

-- Parent comment lookup (for threading)
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- Recent comments
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- ============================================
-- VOTES
-- ============================================
-- Lookup by votable (count sparks/douses for a post or comment)
CREATE INDEX idx_votes_votable ON votes(votable_type, votable_id);

-- User's votes (for showing their vote state)
CREATE INDEX idx_votes_user ON votes(user_id) WHERE anonymized = FALSE;

-- User spark calculation
CREATE INDEX idx_votes_user_sparks ON votes (
    user_id,
    vote_value,
    created_at
) WHERE anonymized = FALSE;

-- Anonymization job (find votes older than 24hrs)
CREATE INDEX idx_votes_created ON votes(created_at) WHERE anonymized = FALSE;

-- ============================================
-- PROPOSALS
-- ============================================
-- Community proposals (active)
CREATE INDEX idx_proposals_community ON proposals(community_id, status, voting_ends_at);

-- Proposals by status (for scheduled jobs)
CREATE INDEX idx_proposals_status ON proposals(status, voting_ends_at);

-- ============================================
-- PROPOSAL VOTES
-- ============================================
CREATE INDEX idx_proposal_votes_proposal ON proposal_votes(proposal_id);

-- ============================================
-- MODERATION LOG
-- ============================================
-- Content lookup (find all moderation for a post/comment)
CREATE INDEX idx_moderation_content ON moderation_log(content_type, content_id);

-- Community moderation log (feed)
CREATE INDEX idx_moderation_community ON moderation_log(community_id, created_at DESC);

-- Decisions by type (analytics)
CREATE INDEX idx_moderation_decision ON moderation_log(decision, created_at DESC);

-- ============================================
-- MODERATION APPEALS
-- ============================================
CREATE INDEX idx_appeals_status ON moderation_appeals(status, created_at);
CREATE INDEX idx_appeals_modlog ON moderation_appeals(moderation_log_id);

-- ============================================
-- AI PROMPT HISTORY
-- ============================================
CREATE INDEX idx_prompt_history_entity ON ai_prompt_history(entity_type, entity_id, version DESC);

-- ============================================
-- COUNCIL MEMBERS
-- ============================================
CREATE INDEX idx_council_category ON council_members(category_id, is_active);
CREATE INDEX idx_council_term ON council_members(term_end) WHERE is_active = TRUE;
