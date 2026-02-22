# FUEGA.AI - DATA SCHEMA & STORAGE

**Last Updated:** February 21, 2026
**Database:** PostgreSQL 15+
**Strategy:** Single-schema multi-tenant with Row-Level Security (RLS)
**Schema Version:** 2.1 (V2 - Gamification, Badges, Cosmetics, Notifications + 4-Tier Governance)

---

## SCHEMA DESIGN PHILOSOPHY

### Core Principles
1. **Security First:** RLS policies enforce data isolation
2. **Audit Everything:** All moderation and governance actions logged
3. **Immutable History:** Soft deletes, never hard deletes
4. **Performance:** Optimized indexes for common queries
5. **Scalability:** Designed for 1M+ posts, 10M+ comments
6. **Extensibility:** JSONB fields for flexible metadata

### Multi-Tenancy Approach
- **Single database, single schema** (cost-effective, manageable)
- **Community isolation via RLS policies**
- **No tenant_id needed** (communities are the organizational unit)
- **Shared infrastructure** with logical separation

---

## TABLE OVERVIEW (21 Total)

### Original Tables (14)
1. users
2. communities
3. categories
4. cohorts
5. community_memberships
6. posts
7. comments
8. votes
9. ai_prompt_history
10. moderation_log
11. moderation_appeals
12. proposals
13. proposal_votes
14. council_members

### New V2 Tables (7)
15. badges
16. user_badges
17. notifications
18. referrals
19. cosmetics
20. user_cosmetics
21. tips

---

## DATABASE SCHEMA

### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt with salt rounds = 12
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE,
    banned_by UUID REFERENCES users(id),

    -- Spark score (reputation)
    post_sparks INTEGER DEFAULT 0,
    comment_sparks INTEGER DEFAULT 0,

    -- V2: Founder badge (first 5000 users)
    founder_number INTEGER UNIQUE CHECK (founder_number >= 1 AND founder_number <= 5000),

    -- V2: Badge & Cosmetics
    primary_badge VARCHAR(50), -- active display badge (references badges.badge_id)
    cosmetics JSONB DEFAULT '{}', -- active cosmetic selections: {"theme": "cosmetic_id", "border": "cosmetic_id", ...}

    -- V2: Referral tracking
    referred_by UUID REFERENCES users(id),
    referral_count INTEGER DEFAULT 0,

    -- Privacy
    ip_address_hash VARCHAR(64), -- SHA-256 hash, for spam prevention
    ip_last_seen TIMESTAMP WITH TIME ZONE,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT sparks_positive CHECK (post_sparks >= 0 AND comment_sparks >= 0),
    CONSTRAINT no_self_referral CHECK (referred_by != id),
    CONSTRAINT referral_count_positive CHECK (referral_count >= 0)
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_founder_number ON users(founder_number) WHERE founder_number IS NOT NULL;
CREATE INDEX idx_users_ip_hash ON users(ip_address_hash) WHERE ip_address_hash IS NOT NULL;
CREATE INDEX idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX idx_users_referral_count ON users(referral_count DESC) WHERE referral_count > 0;
CREATE INDEX idx_users_primary_badge ON users(primary_badge) WHERE primary_badge IS NOT NULL;
```

### 2. Communities Table
```sql
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g., "technology", "politics"
    display_name VARCHAR(100) NOT NULL, -- e.g., "Technology Discussion"
    description TEXT NOT NULL,

    -- AI Moderation (V2: structured config replaces free-form prompts)
    ai_prompt TEXT NOT NULL, -- The active moderation prompt (auto-generated from ai_config)
    ai_prompt_version INTEGER DEFAULT 1,
    ai_config JSONB NOT NULL DEFAULT '{
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
    }'::jsonb,

    -- AI Model Selection (community votes on provider)
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'anthropic', -- V1: anthropic only. Future: openai, grok, llama, etc.
    ai_model VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514', -- Specific model version
    -- Model changes are governance proposals — propose, vote, majority wins

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

    -- V2: Visual customization
    banner_url VARCHAR(500),
    icon_url VARCHAR(500),
    theme JSONB DEFAULT '{}', -- custom theme overrides: {"primary_color": "#hex", "banner_style": "..."}

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),

    -- Stats
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,

    -- Moderation
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT name_format CHECK (name ~ '^[a-z0-9_]+$'), -- lowercase, numbers, underscores only
    CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50)
);

CREATE INDEX idx_communities_name ON communities(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_communities_category ON communities(category_id);
CREATE INDEX idx_communities_created_at ON communities(created_at);
CREATE INDEX idx_communities_member_count ON communities(member_count DESC);
```

### 3. Categories Table
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Category-level AI agent
    ai_prompt TEXT NOT NULL,
    ai_prompt_version INTEGER DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT category_name_format CHECK (name ~ '^[a-z0-9_]+$')
);

CREATE INDEX idx_categories_name ON categories(name);
```

### 4. Cohorts Table
```sql
CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    description TEXT,

    -- AI Model Selection (inherits from community by default, overridable via governance)
    ai_provider VARCHAR(50), -- NULL = inherit from community
    ai_model VARCHAR(100),   -- NULL = inherit from community

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(community_id, slug),
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9_-]+$'),
    CONSTRAINT slug_length CHECK (char_length(slug) >= 2 AND char_length(slug) <= 50)
);

CREATE INDEX idx_cohorts_community ON cohorts(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cohorts_slug ON cohorts(community_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_cohorts_created ON cohorts(created_at);
```

### 5. Community Memberships Table
```sql
CREATE TABLE community_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- V2: Community roles
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('founder', 'moderator', 'vip', 'active_member', 'member', 'lurker')),
    role_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role_assigned_by UUID REFERENCES users(id),

    -- V2: Per-community activity tracking (for role auto-assignment)
    post_count_in_community INTEGER DEFAULT 0,
    comment_count_in_community INTEGER DEFAULT 0,
    sparks_earned_in_community INTEGER DEFAULT 0,

    UNIQUE(user_id, community_id)
);

CREATE INDEX idx_memberships_user ON community_memberships(user_id);
CREATE INDEX idx_memberships_community ON community_memberships(community_id);
CREATE INDEX idx_memberships_joined ON community_memberships(joined_at);
CREATE INDEX idx_memberships_role ON community_memberships(community_id, role);
CREATE INDEX idx_memberships_activity ON community_memberships(community_id, sparks_earned_in_community DESC);
```

### 6. Posts Table
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    author_id UUID NOT NULL REFERENCES users(id),

    -- Content
    title VARCHAR(300) NOT NULL,
    body TEXT, -- Null for link/image posts
    post_type VARCHAR(10) NOT NULL, -- text, link, image
    url TEXT, -- For link posts
    image_url TEXT, -- For image posts (stored elsewhere, this is CDN URL)

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,

    -- Engagement
    sparks INTEGER DEFAULT 0,
    douses INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,

    -- Moderation
    is_approved BOOLEAN DEFAULT FALSE,
    is_removed BOOLEAN DEFAULT FALSE,
    removal_reason TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderated_by_agent VARCHAR(50), -- community, category, or platform

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT post_type_valid CHECK (post_type IN ('text', 'link', 'image')),
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 300),
    CONSTRAINT body_length CHECK (char_length(body) <= 40000),
    CONSTRAINT votes_positive CHECK (sparks >= 0 AND douses >= 0)
);

CREATE INDEX idx_posts_community ON posts(community_id) WHERE deleted_at IS NULL AND is_removed = FALSE;
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_hot ON posts((sparks - douses), created_at DESC) WHERE is_removed = FALSE;
CREATE INDEX idx_posts_moderation ON posts(is_approved, moderated_at) WHERE is_approved = FALSE;
```

### 7. Comments Table
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id),
    author_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES comments(id), -- NULL for top-level comments

    -- Content
    body TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    depth INTEGER DEFAULT 0, -- 0 = top-level, increases with nesting

    -- Engagement
    sparks INTEGER DEFAULT 0,
    douses INTEGER DEFAULT 0,

    -- Moderation
    is_approved BOOLEAN DEFAULT FALSE,
    is_removed BOOLEAN DEFAULT FALSE,
    removal_reason TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderated_by_agent VARCHAR(50),

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT body_length CHECK (char_length(body) >= 1 AND char_length(body) <= 10000),
    CONSTRAINT depth_reasonable CHECK (depth >= 0 AND depth < 100),
    CONSTRAINT votes_positive CHECK (sparks >= 0 AND douses >= 0)
);

CREATE INDEX idx_comments_post ON comments(post_id) WHERE deleted_at IS NULL AND is_removed = FALSE;
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
```

### 8. Votes Table
```sql
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    votable_type VARCHAR(10) NOT NULL, -- post or comment
    votable_id UUID NOT NULL, -- post_id or comment_id
    vote_value SMALLINT NOT NULL, -- 1 (spark) or -1 (douse)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Anonymization (hash user_id after 24hrs for privacy)
    anonymized BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, votable_type, votable_id),
    CONSTRAINT vote_value_valid CHECK (vote_value IN (-1, 1)),
    CONSTRAINT votable_type_valid CHECK (votable_type IN ('post', 'comment'))
);

CREATE INDEX idx_votes_user ON votes(user_id) WHERE anonymized = FALSE;
CREATE INDEX idx_votes_votable ON votes(votable_type, votable_id);
CREATE INDEX idx_votes_created ON votes(created_at);
```

### 9. AI Prompt History Table
```sql
CREATE TABLE ai_prompt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL, -- community, category, platform
    entity_id UUID, -- community_id or category_id (NULL for platform)

    prompt_text TEXT NOT NULL, -- auto-generated from ai_config
    version INTEGER NOT NULL,

    -- V2: Structured config that generated this prompt
    ai_config JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id), -- NULL for platform changes

    -- For governance
    proposal_id UUID REFERENCES proposals(id),

    CONSTRAINT entity_type_valid CHECK (entity_type IN ('cohort', 'community', 'category', 'platform'))
);

CREATE INDEX idx_prompt_history_entity ON ai_prompt_history(entity_type, entity_id, version DESC);
```

### 10. Moderation Log Table
```sql
CREATE TABLE moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was moderated
    content_type VARCHAR(10) NOT NULL, -- post or comment
    content_id UUID NOT NULL,
    community_id UUID NOT NULL REFERENCES communities(id),

    -- Who authored it
    author_id UUID NOT NULL REFERENCES users(id),

    -- Decision
    agent_level VARCHAR(20) NOT NULL, -- community, category, platform
    decision VARCHAR(20) NOT NULL, -- approved, removed, flagged, warned
    reason TEXT NOT NULL, -- AI-generated explanation

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_model VARCHAR(50), -- e.g., "claude-sonnet-4"
    prompt_version INTEGER,

    -- Appeal
    appealed BOOLEAN DEFAULT FALSE,
    appeal_id UUID REFERENCES moderation_appeals(id),

    CONSTRAINT content_type_valid CHECK (content_type IN ('post', 'comment')),
    CONSTRAINT agent_level_valid CHECK (agent_level IN ('cohort', 'community', 'category', 'platform')),
    CONSTRAINT decision_valid CHECK (decision IN ('approved', 'removed', 'flagged', 'warned'))
);

CREATE INDEX idx_moderation_content ON moderation_log(content_type, content_id);
CREATE INDEX idx_moderation_community ON moderation_log(community_id, created_at DESC);
CREATE INDEX idx_moderation_decision ON moderation_log(decision, created_at DESC);
```

### 11. Moderation Appeals Table
```sql
CREATE TABLE moderation_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderation_log_id UUID NOT NULL REFERENCES moderation_log(id),

    appellant_id UUID NOT NULL REFERENCES users(id),
    appeal_text TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Resolution
    status VARCHAR(20) DEFAULT 'pending', -- pending, upheld, overturned
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_reason TEXT,
    resolved_by_agent VARCHAR(20), -- category or platform

    CONSTRAINT appeal_length CHECK (char_length(appeal_text) <= 500),
    CONSTRAINT status_valid CHECK (status IN ('pending', 'upheld', 'overturned'))
);

CREATE INDEX idx_appeals_status ON moderation_appeals(status, created_at);
CREATE INDEX idx_appeals_modlog ON moderation_appeals(moderation_log_id);
```

### 12. Proposals Table
```sql
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),

    -- Proposal details
    proposal_type VARCHAR(30) NOT NULL, -- modify_config, change_settings, elect_council, etc.
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- What changes (V2: structured config changes, not free-form prompts)
    proposed_changes JSONB NOT NULL, -- structured AI config changes or settings changes

    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),

    discussion_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,

    status VARCHAR(20) DEFAULT 'discussion', -- discussion, voting, passed, failed, implemented

    -- Results
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,

    implemented_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT proposal_type_valid CHECK (proposal_type IN (
        'modify_config', 'change_settings', 'elect_council',
        'remove_moderator', 'amend_rules', 'change_category'
    )),
    CONSTRAINT status_valid CHECK (status IN (
        'discussion', 'voting', 'passed', 'failed', 'implemented'
    ))
);

CREATE INDEX idx_proposals_community ON proposals(community_id, status, voting_ends_at);
CREATE INDEX idx_proposals_status ON proposals(status, voting_ends_at);
```

### 13. Proposal Votes Table
```sql
CREATE TABLE proposal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id),
    user_id UUID NOT NULL REFERENCES users(id),

    vote VARCHAR(10) NOT NULL, -- for, against, abstain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(proposal_id, user_id),
    CONSTRAINT vote_valid CHECK (vote IN ('for', 'against', 'abstain'))
);

CREATE INDEX idx_proposal_votes_proposal ON proposal_votes(proposal_id);
```

### 14. Council Members Table
```sql
CREATE TABLE council_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    user_id UUID NOT NULL REFERENCES users(id),

    term_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    term_end TIMESTAMP WITH TIME ZONE NOT NULL,

    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_council_category ON council_members(category_id, is_active);
CREATE INDEX idx_council_term ON council_members(term_end) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_council_unique_active ON council_members(category_id, community_id) WHERE is_active = TRUE;
```

---

## V2 NEW TABLES

### 15. Badges Table
```sql
-- Badge definitions catalog (system-managed, not user-created)
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_id VARCHAR(50) NOT NULL UNIQUE, -- e.g., "v1_founder", "v1_ambassador"
    name VARCHAR(100) NOT NULL, -- Display name: "V1 Founder"
    description TEXT NOT NULL, -- "One of the first 5000 users"
    icon_url VARCHAR(500), -- CDN URL to badge icon
    category VARCHAR(30) NOT NULL, -- founder, engagement, contribution, governance, referral, special
    rarity VARCHAR(20) NOT NULL, -- common, uncommon, rare, epic, legendary
    version VARCHAR(10) DEFAULT 'v1', -- which version of fuega.ai introduced this badge

    -- Earn criteria (structured, server-validated)
    earn_criteria JSONB NOT NULL DEFAULT '{}',
    -- Examples:
    -- {"type": "founder", "max_users": 5000}
    -- {"type": "referral_count", "min_referrals": 5}
    -- {"type": "post_count", "min_posts": 100}
    -- {"type": "spark_score", "min_score": 1000}
    -- {"type": "community_founder", "min_communities": 1}
    -- {"type": "governance_participation", "min_votes": 50}
    -- {"type": "account_age", "min_days": 365}
    -- {"type": "tip", "any_amount": true}

    -- Display order within category
    sort_order INTEGER DEFAULT 0,

    -- Whether this badge is currently earnable
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT category_valid CHECK (category IN (
        'founder', 'engagement', 'contribution', 'governance', 'referral', 'special'
    )),
    CONSTRAINT rarity_valid CHECK (rarity IN (
        'common', 'uncommon', 'rare', 'epic', 'legendary'
    ))
);

CREATE INDEX idx_badges_category ON badges(category, sort_order);
CREATE INDEX idx_badges_rarity ON badges(rarity);
CREATE INDEX idx_badges_active ON badges(is_active) WHERE is_active = TRUE;
```

### 16. User Badges Table
```sql
-- Which badges each user has earned
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id VARCHAR(50) NOT NULL REFERENCES badges(badge_id),

    -- Extra metadata per award
    metadata JSONB DEFAULT '{}',
    -- Examples:
    -- {"founder_number": 42} for founder badge
    -- {"referral_count": 25} for referral badges
    -- {"post_count": 100} for contribution badges

    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Notification tracking
    notified BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);
CREATE INDEX idx_user_badges_check ON user_badges(user_id, badge_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_unnotified ON user_badges(user_id) WHERE notified = FALSE;
```

### 17. Notifications Table
```sql
-- In-app and push notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Notification type
    type VARCHAR(30) NOT NULL,
    -- Types: reply_post, reply_comment, spark, mention,
    --        community_update, governance, badge_earned,
    --        tip_received, referral

    -- Display content
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    action_url VARCHAR(500), -- Where clicking the notification takes you

    -- Structured content for rendering
    content JSONB DEFAULT '{}',
    -- Examples:
    -- {"post_id": "uuid", "comment_id": "uuid", "author": "username"}
    -- {"badge_id": "v1_founder", "badge_name": "V1 Founder"}
    -- {"spark_count": 10, "post_id": "uuid"} (batched sparks)
    -- {"referral_username": "newuser"}

    -- Read status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Push notification tracking
    push_sent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT type_valid CHECK (type IN (
        'reply_post', 'reply_comment', 'spark', 'mention',
        'community_update', 'governance', 'badge_earned',
        'tip_received', 'referral'
    ))
);

-- Primary query: unread notifications for a user, newest first
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read = FALSE;
-- All notifications for a user (inbox view)
CREATE INDEX idx_notifications_user_all ON notifications(user_id, created_at DESC);
-- Push notification queue
CREATE INDEX idx_notifications_push_pending ON notifications(created_at) WHERE push_sent = FALSE;
-- Cleanup: find old read notifications
CREATE INDEX idx_notifications_cleanup ON notifications(read_at) WHERE read = TRUE;
```

### 18. Referrals Table
```sql
-- Track user referrals
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referee_id UUID NOT NULL REFERENCES users(id),

    -- Tracking
    referral_link VARCHAR(100) NOT NULL, -- unique link slug
    ip_hash VARCHAR(64), -- SHA-256 hash of referee's IP at signup (for fraud detection)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Each user can only be referred once
    UNIQUE(referee_id),
    -- Prevent self-referral
    CONSTRAINT no_self_referral CHECK (referrer_id != referee_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id, created_at DESC);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);
CREATE INDEX idx_referrals_link ON referrals(referral_link);
CREATE INDEX idx_referrals_ip ON referrals(ip_hash) WHERE ip_hash IS NOT NULL;
```

### 19. Cosmetics Table
```sql
-- Purchasable cosmetics catalog (system-managed)
CREATE TABLE cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cosmetic_id VARCHAR(50) NOT NULL UNIQUE, -- e.g., "theme_lava_pro", "border_gold"
    name VARCHAR(100) NOT NULL, -- "Lava Pro Theme"
    description TEXT NOT NULL,
    preview_url VARCHAR(500), -- CDN URL to preview image

    -- Classification
    category VARCHAR(20) NOT NULL, -- theme, border, title, color, avatar, banner, icon
    subcategory VARCHAR(20) NOT NULL, -- profile, community

    -- Pricing (in cents, USD)
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),

    -- Extra metadata (CSS values, config, etc.)
    metadata JSONB DEFAULT '{}',
    -- Examples:
    -- {"css_class": "theme-lava-pro", "colors": {"primary": "#FF4500", "accent": "#FF6B2C"}}
    -- {"border_style": "2px solid gold", "glow": "0 0 10px gold"}
    -- {"title_text": "Flame Bearer", "title_color": "#FF4500"}
    -- {"username_color": "#00D4AA"}

    -- Availability
    available BOOLEAN DEFAULT TRUE,

    -- Display order
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT category_valid CHECK (category IN (
        'theme', 'border', 'title', 'color', 'avatar', 'banner', 'icon'
    )),
    CONSTRAINT subcategory_valid CHECK (subcategory IN ('profile', 'community'))
);

CREATE INDEX idx_cosmetics_category ON cosmetics(category, subcategory, sort_order);
CREATE INDEX idx_cosmetics_available ON cosmetics(available, category) WHERE available = TRUE;
CREATE INDEX idx_cosmetics_price ON cosmetics(price_cents);
```

### 20. User Cosmetics Table
```sql
-- Which cosmetics each user owns (purchase history)
CREATE TABLE user_cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    cosmetic_id VARCHAR(50) NOT NULL REFERENCES cosmetics(cosmetic_id),

    -- Purchase info
    price_paid_cents INTEGER NOT NULL, -- actual price at time of purchase
    stripe_payment_id VARCHAR(100), -- Stripe PaymentIntent ID

    -- Refund tracking
    refunded BOOLEAN DEFAULT FALSE,
    refunded_at TIMESTAMP WITH TIME ZONE,

    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, cosmetic_id)
);

CREATE INDEX idx_user_cosmetics_user ON user_cosmetics(user_id, purchased_at DESC);
CREATE INDEX idx_user_cosmetics_stripe ON user_cosmetics(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
CREATE INDEX idx_user_cosmetics_refundable ON user_cosmetics(user_id, purchased_at)
    WHERE refunded = FALSE AND purchased_at > NOW() - INTERVAL '7 days';
```

### 21. Tips Table
```sql
-- Platform tip jar donations
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Payment
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    stripe_payment_id VARCHAR(100) NOT NULL, -- Stripe PaymentIntent ID

    -- Type
    recurring BOOLEAN DEFAULT FALSE,

    -- Optional message
    message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT message_length CHECK (message IS NULL OR char_length(message) <= 500)
);

CREATE INDEX idx_tips_user ON tips(user_id, created_at DESC);
CREATE INDEX idx_tips_stripe ON tips(stripe_payment_id);
CREATE INDEX idx_tips_created ON tips(created_at DESC);
CREATE INDEX idx_tips_recurring ON tips(user_id) WHERE recurring = TRUE;
```

---

## ROW-LEVEL SECURITY POLICIES

### Principle
- Users can only see/modify their own data
- Public data (posts, comments) visible to all
- Moderation logs public to all
- Governance visible to community members
- Badge catalog public, user badges viewable by all
- Cosmetics catalog public, purchases private
- Notifications private (own only)
- Referrals: referrer can see own referrals
- Tips: private to user

### User Policies
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_all ON users
    FOR SELECT
    USING (true); -- All users visible for attribution

CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (id = current_setting('app.user_id')::uuid);
```

### Post Policies
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_select_public ON posts
    FOR SELECT
    USING (
        is_approved = TRUE
        AND is_removed = FALSE
        AND deleted_at IS NULL
    );

CREATE POLICY posts_insert_own ON posts
    FOR INSERT
    WITH CHECK (author_id = current_setting('app.user_id')::uuid);

CREATE POLICY posts_update_own ON posts
    FOR UPDATE
    USING (author_id = current_setting('app.user_id')::uuid);
```

### Vote Policies
```sql
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY votes_select_own ON votes
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY votes_insert_own ON votes
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);
```

### Moderation Log Policies
```sql
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_log_select_all ON moderation_log
    FOR SELECT
    USING (true); -- Transparency: all moderation decisions public
```

### Badge Policies
```sql
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Badge catalog is public
CREATE POLICY badges_select_all ON badges
    FOR SELECT
    USING (true);

-- Only system can insert/update badges (via service role, bypasses RLS)
```

### User Badge Policies
```sql
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Anyone can see anyone's badges (public display)
CREATE POLICY user_badges_select_all ON user_badges
    FOR SELECT
    USING (true);

-- Only system can award badges (via service role)
```

### Notification Policies
```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY notifications_select_own ON notifications
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE
    USING (user_id = current_setting('app.user_id')::uuid);
```

### Referral Policies
```sql
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Referrer can see their own referrals
CREATE POLICY referrals_select_own ON referrals
    FOR SELECT
    USING (referrer_id = current_setting('app.user_id')::uuid);
```

### Cosmetics Policies
```sql
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;

-- Cosmetics catalog is public
CREATE POLICY cosmetics_select_all ON cosmetics
    FOR SELECT
    USING (available = TRUE);
```

### User Cosmetics Policies
```sql
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own purchases
CREATE POLICY user_cosmetics_select_own ON user_cosmetics
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);
```

### Tips Policies
```sql
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tips
CREATE POLICY tips_select_own ON tips
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);
```

### Community Memberships Policies
```sql
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;

-- Public: anyone can see memberships (for member counts, role displays)
CREATE POLICY memberships_select_all ON community_memberships
    FOR SELECT
    USING (true);

CREATE POLICY memberships_insert_own ON community_memberships
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);

CREATE POLICY memberships_delete_own ON community_memberships
    FOR DELETE
    USING (user_id = current_setting('app.user_id')::uuid);
```

---

## TRIGGERS

### Auto-update Timestamps
```sql
-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.edited_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    WHEN (OLD.body IS DISTINCT FROM NEW.body OR OLD.title IS DISTINCT FROM NEW.title)
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    WHEN (OLD.body IS DISTINCT FROM NEW.body)
    EXECUTE FUNCTION update_updated_at();
```

### Community Member Count
```sql
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memberships_count_trigger
    AFTER INSERT OR DELETE ON community_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_community_member_count();
```

### Referral Count Update
```sql
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET referral_count = referral_count + 1 WHERE id = NEW.referrer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referrals_count_trigger
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_count();
```

### Community Post Count
```sql
CREATE OR REPLACE FUNCTION update_community_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_approved = TRUE THEN
        UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_community_count_trigger
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_community_post_count();
```

### Membership Activity Tracking
```sql
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

CREATE TRIGGER posts_membership_activity
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_activity_post();

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

CREATE TRIGGER comments_membership_activity
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_activity_comment();
```

---

## INDEXES STRATEGY

### Performance Optimization
```sql
-- Hot posts (most common query)
CREATE INDEX idx_posts_hot_score ON posts (
    (sparks - douses) DESC,
    created_at DESC
) WHERE is_approved = TRUE AND is_removed = FALSE;

-- New posts
CREATE INDEX idx_posts_new ON posts (
    created_at DESC
) WHERE is_approved = TRUE AND is_removed = FALSE;

-- Community posts
CREATE INDEX idx_posts_community_hot ON posts (
    community_id,
    (sparks - douses) DESC,
    created_at DESC
) WHERE is_approved = TRUE AND is_removed = FALSE;

-- User spark calculation
CREATE INDEX idx_votes_user_sparks ON votes (
    user_id,
    vote_value,
    created_at
) WHERE anonymized = FALSE;

-- Comment threading
CREATE INDEX idx_comments_thread ON comments (
    post_id,
    parent_id,
    created_at ASC
) WHERE is_approved = TRUE AND is_removed = FALSE;

-- Notification inbox (critical for V2)
CREATE INDEX idx_notifications_inbox ON notifications (
    user_id,
    read,
    created_at DESC
);

-- Badge eligibility checks
CREATE INDEX idx_user_badges_eligibility ON user_badges (user_id, badge_id);

-- Referral leaderboard
CREATE INDEX idx_users_referral_leaderboard ON users (referral_count DESC)
    WHERE referral_count > 0 AND deleted_at IS NULL;

-- Cosmetic shop browsing
CREATE INDEX idx_cosmetics_shop ON cosmetics (category, subcategory, sort_order)
    WHERE available = TRUE;
```

---

## MIGRATION FILES

### Migration 001: Initial Schema (14 tables)
```
migrations/001_initial_schema.sql
- users, communities, categories, cohorts, community_memberships
- posts, comments, votes
- ai_prompt_history, moderation_log, moderation_appeals
- proposals, proposal_votes, council_members
```

### Migration 002: RLS Policies
```
migrations/002_rls_policies.sql
- Enable RLS on all 13 tables
- Create all SELECT/INSERT/UPDATE/DELETE policies
```

### Migration 003: Indexes
```
migrations/003_indexes.sql
- All performance indexes for original tables
```

### Migration 004: Seed Data
```
migrations/004_seed_data.sql
- 5 default categories
- Default AI prompts
- System user
```

### Migration 005: Triggers
```
migrations/005_triggers.sql
- updated_at triggers
- member count triggers
- post count triggers
```

### Migration 006: V2 Badge Tables
```sql
-- migrations/006_v2_badges.sql
-- Add founder_number, primary_badge, cosmetics, referred_by, referral_count to users
-- Create badges table
-- Create user_badges table
-- Seed badge definitions

ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_number INTEGER UNIQUE CHECK (founder_number >= 1 AND founder_number <= 5000);
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_badge VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cosmetics JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT no_self_referral CHECK (referred_by != id);

-- Create badges table (full DDL above)
-- Create user_badges table (full DDL above)

-- Seed badge definitions
INSERT INTO badges (badge_id, name, description, category, rarity, earn_criteria, sort_order) VALUES
('v1_founder', 'V1 Founder', 'One of the first 5000 fuega.ai users', 'founder', 'legendary', '{"type": "founder", "max_users": 5000}', 1),
('early_adopter', 'Early Adopter', 'Joined fuega.ai in the first month', 'founder', 'epic', '{"type": "account_age_before", "before_date": "2026-04-01"}', 2),
('first_post', 'First Spark', 'Created your first post', 'engagement', 'common', '{"type": "post_count", "min_posts": 1}', 1),
('prolific_poster', 'Prolific Poster', 'Created 100+ posts', 'engagement', 'rare', '{"type": "post_count", "min_posts": 100}', 2),
('conversation_starter', 'Conversation Starter', 'Created 10+ posts with 10+ comments each', 'engagement', 'uncommon', '{"type": "engaging_posts", "min_posts": 10, "min_comments_per": 10}', 3),
('first_comment', 'Commentator', 'Left your first comment', 'engagement', 'common', '{"type": "comment_count", "min_comments": 1}', 4),
('prolific_commenter', 'Voice of the Community', 'Left 500+ comments', 'engagement', 'rare', '{"type": "comment_count", "min_comments": 500}', 5),
('spark_collector_100', 'Spark Collector', 'Earned 100+ spark score', 'contribution', 'common', '{"type": "spark_score", "min_score": 100}', 1),
('spark_collector_1000', 'Flame Keeper', 'Earned 1000+ spark score', 'contribution', 'uncommon', '{"type": "spark_score", "min_score": 1000}', 2),
('spark_collector_10000', 'Inferno', 'Earned 10000+ spark score', 'contribution', 'epic', '{"type": "spark_score", "min_score": 10000}', 3),
('community_founder', 'Community Builder', 'Founded a community', 'contribution', 'uncommon', '{"type": "community_founder", "min_communities": 1}', 4),
('governance_voter', 'Civic Duty', 'Voted on 10+ governance proposals', 'governance', 'common', '{"type": "governance_participation", "min_votes": 10}', 1),
('governance_proposer', 'Proposal Writer', 'Created 5+ governance proposals', 'governance', 'uncommon', '{"type": "governance_proposals", "min_proposals": 5}', 2),
('council_member', 'Council Member', 'Served on a category council', 'governance', 'rare', '{"type": "council_service", "min_terms": 1}', 3),
('v1_ambassador', 'Ambassador', 'Referred 5+ users to fuega.ai', 'referral', 'uncommon', '{"type": "referral_count", "min_referrals": 5}', 1),
('v1_influencer', 'Influencer', 'Referred 25+ users to fuega.ai', 'referral', 'rare', '{"type": "referral_count", "min_referrals": 25}', 2),
('v1_legend', 'Legend', 'Referred 100+ users to fuega.ai', 'referral', 'legendary', '{"type": "referral_count", "min_referrals": 100}', 3),
('supporter', 'Supporter', 'Made a tip to support fuega.ai', 'special', 'uncommon', '{"type": "tip", "any_amount": true}', 1),
('generous_supporter', 'Generous Supporter', 'Tipped $50+ total to fuega.ai', 'special', 'rare', '{"type": "tip_total", "min_cents": 5000}', 2),
('one_year', 'Anniversary', 'Member for 1+ year', 'special', 'uncommon', '{"type": "account_age", "min_days": 365}', 3);
```

### Migration 007: V2 Notifications Table
```sql
-- migrations/007_v2_notifications.sql
-- Create notifications table (full DDL above)
-- Create all notification indexes
```

### Migration 008: V2 Referrals Table
```sql
-- migrations/008_v2_referrals.sql
-- Create referrals table (full DDL above)
-- Create referral count trigger
-- Create indexes
```

### Migration 009: V2 Cosmetics Tables
```sql
-- migrations/009_v2_cosmetics.sql
-- Create cosmetics catalog table (full DDL above)
-- Create user_cosmetics purchase table (full DDL above)
-- Create indexes

-- Seed initial cosmetics catalog
INSERT INTO cosmetics (cosmetic_id, name, description, category, subcategory, price_cents, metadata) VALUES
-- Profile Themes
('theme_lava_pro', 'Lava Pro', 'Enhanced lava theme with animated gradients', 'theme', 'profile', 499, '{"css_class": "theme-lava-pro"}'),
('theme_ember_glow', 'Ember Glow', 'Warm ember glow effect on profile', 'theme', 'profile', 499, '{"css_class": "theme-ember-glow"}'),
('theme_teal_flame', 'Teal Flame', 'Cool teal fire effect', 'theme', 'profile', 499, '{"css_class": "theme-teal-flame"}'),
('theme_void', 'The Void', 'Pure dark theme with subtle particles', 'theme', 'profile', 299, '{"css_class": "theme-void"}'),
('theme_neon', 'Neon Nights', 'Cyberpunk neon accents', 'theme', 'profile', 699, '{"css_class": "theme-neon"}'),

-- Profile Borders
('border_gold', 'Gold Ring', 'Gold border around avatar', 'border', 'profile', 299, '{"border_style": "2px solid #FFD700", "glow": "0 0 8px rgba(255,215,0,0.4)"}'),
('border_fire', 'Fire Ring', 'Animated fire border', 'border', 'profile', 499, '{"border_style": "2px solid #FF4500", "glow": "0 0 12px rgba(255,69,0,0.6)", "animated": true}'),
('border_teal', 'Teal Ring', 'Teal glow border', 'border', 'profile', 299, '{"border_style": "2px solid #00D4AA", "glow": "0 0 8px rgba(0,212,170,0.4)"}'),
('border_rainbow', 'Prismatic Ring', 'Rotating rainbow border', 'border', 'profile', 799, '{"animated": true, "css_class": "border-rainbow"}'),

-- Display Titles
('title_flame_bearer', 'Flame Bearer', 'Display title: Flame Bearer', 'title', 'profile', 199, '{"title_text": "Flame Bearer", "title_color": "#FF4500"}'),
('title_shadow_walker', 'Shadow Walker', 'Display title: Shadow Walker', 'title', 'profile', 199, '{"title_text": "Shadow Walker", "title_color": "#8B8B8B"}'),
('title_lava_lord', 'Lava Lord', 'Display title: Lava Lord', 'title', 'profile', 399, '{"title_text": "Lava Lord", "title_color": "#FF3D00"}'),
('title_void_dweller', 'Void Dweller', 'Display title: Void Dweller', 'title', 'profile', 299, '{"title_text": "Void Dweller", "title_color": "#555555"}'),

-- Username Colors
('color_gold', 'Gold Username', 'Display your username in gold', 'color', 'profile', 199, '{"username_color": "#FFD700"}'),
('color_teal', 'Teal Username', 'Display your username in teal', 'color', 'profile', 199, '{"username_color": "#00D4AA"}'),
('color_ember', 'Ember Username', 'Display your username in ember', 'color', 'profile', 199, '{"username_color": "#FF3D00"}'),
('color_purple', 'Purple Username', 'Display your username in purple', 'color', 'profile', 199, '{"username_color": "#9B59B6"}'),

-- Community Themes
('community_theme_fire', 'Fire Community Theme', 'Enhanced fire theme for your community', 'theme', 'community', 999, '{"css_class": "community-fire"}'),
('community_theme_teal', 'Teal Community Theme', 'Cool teal theme for your community', 'theme', 'community', 999, '{"css_class": "community-teal"}'),
('community_theme_dark', 'Dark Void Community Theme', 'Extra dark theme for your community', 'theme', 'community', 799, '{"css_class": "community-dark"}'),

-- Community Icons
('community_icon_flame', 'Flame Icon', 'Animated flame community icon', 'icon', 'community', 499, '{"icon_type": "flame", "animated": true}'),
('community_icon_shield', 'Shield Icon', 'Shield community icon', 'icon', 'community', 299, '{"icon_type": "shield"}'),
('community_icon_star', 'Star Icon', 'Star community icon', 'icon', 'community', 299, '{"icon_type": "star"}');
```

### Migration 010: V2 Tips and Community Updates
```sql
-- migrations/010_v2_tips_and_updates.sql
-- Create tips table (full DDL above)
-- Update communities with V2 columns
-- Update community_memberships with V2 columns
-- Update ai_prompt_history with V2 columns

ALTER TABLE communities ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}';
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

ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member';
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES users(id);
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS post_count_in_community INTEGER DEFAULT 0;
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS comment_count_in_community INTEGER DEFAULT 0;
ALTER TABLE community_memberships ADD COLUMN IF NOT EXISTS sparks_earned_in_community INTEGER DEFAULT 0;

ALTER TABLE ai_prompt_history ADD COLUMN IF NOT EXISTS ai_config JSONB NOT NULL DEFAULT '{}';

-- V2 RLS policies for new tables
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- (All policies defined in RLS section above)
```

---

## CRON JOBS

### Badge Eligibility Check (Hourly)
```sql
-- Only runs when ENABLE_BADGE_DISTRIBUTION=true
-- Checks all users against all badge earn_criteria
-- Awards badges to eligible users who don't already have them
-- Creates notification for each new badge awarded

-- Pseudocode (implemented in application layer):
-- FOR each active badge:
--   FOR each user not already holding this badge:
--     IF user meets earn_criteria:
--       INSERT INTO user_badges (user_id, badge_id, metadata)
--       INSERT INTO notifications (user_id, type, title, body, content)
```

### Notification Cleanup (Weekly)
```sql
-- Delete read notifications older than 30 days
DELETE FROM notifications
WHERE read = TRUE
AND read_at < NOW() - INTERVAL '30 days';
```

### Vote Anonymization (Daily)
```sql
-- Anonymize votes older than 24 hours
UPDATE votes
SET user_id = gen_random_uuid(), anonymized = TRUE
WHERE created_at < NOW() - INTERVAL '24 hours' AND anonymized = FALSE;
```

### IP Hash Cleanup (Daily)
```sql
-- Delete IP hashes older than 30 days
UPDATE users
SET ip_address_hash = NULL, ip_last_seen = NULL
WHERE ip_last_seen < NOW() - INTERVAL '30 days';
```

### Community Role Auto-Assignment (Daily)
```sql
-- Auto-assign roles based on activity:
-- lurker: 0 posts, 0 comments in last 30 days
-- member: default
-- active_member: 5+ posts OR 20+ comments in last 30 days
-- vip: top 5% by sparks_earned_in_community
-- founder: manually set (community creator)
-- moderator: manually set

-- Implemented in application layer with above criteria
```

---

## DATA PARTITIONING (Future)

### Considerations for Scale
When we hit 10M+ posts, consider:
- **Partitioning by created_at** (monthly or yearly)
- **Separate hot/cold storage** (old posts to archive)
- **Read replicas** for vote counting, spark score calculation
- **Notifications partitioned by month** (high volume table)

```sql
-- Example: Partition posts by year
CREATE TABLE posts_2026 PARTITION OF posts
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE posts_2027 PARTITION OF posts
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Example: Partition notifications by month (high volume)
CREATE TABLE notifications_2026_03 PARTITION OF notifications
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

---

## BACKUP & RECOVERY

### Backup Strategy
- **Full backups:** Daily at 2AM UTC
- **Incremental backups:** Every 6 hours
- **WAL archiving:** Continuous (for point-in-time recovery)
- **Retention:** 30 days full, 7 days incremental

### Critical Tables (Priority Backup)
1. users (including founder_number, badges)
2. posts
3. comments
4. moderation_log (NEVER lose transparency)
5. proposals
6. communities
7. user_cosmetics (purchase records - financial data)
8. tips (financial data)
9. badges / user_badges
10. referrals

### Recovery SLA
- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 6 hours max data loss

---

## SECURITY CONSIDERATIONS

### Password Storage
- **Algorithm:** bcrypt
- **Work factor:** 12 rounds (increases with Moore's Law)
- **Salt:** Unique per user (automatic with bcrypt)

### IP Address Handling
- **Storage:** SHA-256 hash only (not raw IP)
- **Purpose:** Spam/bot prevention, referral fraud detection
- **Retention:** 30 days, then deleted
- **Querying:** Hash incoming IP and compare

### Financial Data (V2)
- **Stripe handles PCI compliance** (no card data stored)
- **Payment IDs stored** for refund processing
- **Purchase history immutable** (no deletion)
- **Tips are non-refundable** (except via Stripe dispute)

### Anonymization
```sql
-- Run nightly: Anonymize votes older than 24hrs
UPDATE votes
SET user_id = gen_random_uuid(), anonymized = TRUE
WHERE created_at < NOW() - INTERVAL '24 hours' AND anonymized = FALSE;
```

### SQL Injection Prevention
- **Always use parameterized queries**
- **Never concatenate user input into SQL**
- **Use ORMs or query builders with escaping**
- **JSONB fields validated before storage**

---

## MONITORING QUERIES

### Health Checks
```sql
-- Active users (last 24h)
SELECT COUNT(DISTINCT user_id)
FROM posts
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Moderation backlog
SELECT COUNT(*)
FROM posts
WHERE is_approved = FALSE AND created_at > NOW() - INTERVAL '1 hour';

-- Pending appeals
SELECT COUNT(*)
FROM moderation_appeals
WHERE status = 'pending' AND created_at > NOW() - INTERVAL '24 hours';

-- Unread notifications (system health)
SELECT COUNT(*)
FROM notifications
WHERE read = FALSE AND created_at > NOW() - INTERVAL '24 hours';

-- Badge distribution rate
SELECT badge_id, COUNT(*) as awards_today
FROM user_badges
WHERE earned_at > NOW() - INTERVAL '24 hours'
GROUP BY badge_id;

-- Cosmetic purchase rate
SELECT COUNT(*), SUM(price_paid_cents) as revenue_cents
FROM user_cosmetics
WHERE purchased_at > NOW() - INTERVAL '24 hours' AND refunded = FALSE;

-- Tip revenue
SELECT COUNT(*), SUM(amount_cents) as tip_cents
FROM tips
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Referral conversion
SELECT COUNT(*) as new_referrals
FROM referrals
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slowest queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## NEXT STEPS

1. **Create database** in Railway/existing PostgreSQL
2. **Run migrations 001-005** (original schema)
3. **Run migrations 006-010** (V2 additions)
4. **Apply RLS policies**
5. **Create indexes** for performance
6. **Seed badge definitions** and cosmetics catalog
7. **Set up cron jobs** (badge check, notification cleanup, anonymization)
8. **Write seed data** for testing
9. **Document API queries** for each endpoint

---

**Schema Version:** 2.1
**Total Tables:** 21 (14 original + 7 new)
**Total Indexes:** 50+
**Total Triggers:** 6
**Total RLS Policies:** 20+
**Last Migration:** 010_v2_tips_and_updates.sql
**Next Review:** After V2 launch
