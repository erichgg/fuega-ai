# FUEGA.AI - DATA SCHEMA & STORAGE

**Last Updated:** February 22, 2026
**Database:** PostgreSQL 15+
**Strategy:** Single-schema multi-tenant with Row-Level Security (RLS)
**Schema Version:** 3.0 (Flat community model, governance variables, Tender system)

---

## SCHEMA DESIGN PHILOSOPHY

### Core Principles
1. **Security First:** RLS policies enforce data isolation
2. **Audit Everything:** All moderation and governance actions logged
3. **Immutable History:** Soft deletes, never hard deletes
4. **Performance:** Optimized indexes for common queries
5. **Scalability:** Designed for 1M+ posts, 10M+ comments
6. **Extensibility:** Governance variables are data-driven (DB inserts, not code)

### Architecture
- **Single database, single schema** (cost-effective, manageable)
- **Campfire isolation via RLS policies**
- **Flat model:** No categories, no tiers, no nesting — just campfires
- **Governance variables** are a registry table — adding new ones = INSERT, not code change

---

## TABLE OVERVIEW (24 Total)

### Core Tables (9)
1. users
2. campfires
3. campfire_members
4. posts
5. comments
6. votes
7. campfire_mod_logs
8. site_mod_logs
9. ip_hashes

### Governance Tables (5)
10. governance_variables
11. campfire_settings
12. campfire_settings_history
13. proposals
14. proposal_votes

### Gamification Tables (7)
15. badges
16. user_badges
17. notifications
18. referrals
19. cosmetics
20. user_cosmetics
21. tips

### Chat Tables (2)
22. chat_rooms
23. chat_messages

### Moderation Tables (1)
24. moderation_appeals

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

    -- Glow (reputation)
    post_glow INTEGER DEFAULT 0,
    comment_glow INTEGER DEFAULT 0,

    -- Founder badge (first 5000 users)
    founder_number INTEGER UNIQUE CHECK (founder_number >= 1 AND founder_number <= 5000),

    -- Badge & Cosmetics
    primary_badge VARCHAR(50), -- active display badge (references badges.badge_id)
    cosmetics JSONB DEFAULT '{}', -- active cosmetic selections

    -- Profile (all optional — anonymous by default, customizable by choice)
    display_name VARCHAR(50),          -- optional display name (shown alongside username)
    bio TEXT CHECK (length(bio) <= 500), -- about me (max 500 chars)
    location VARCHAR(100),             -- free text: city, country, "the internet", etc.
    website VARCHAR(255),              -- personal URL
    social_links JSONB DEFAULT '{}',   -- {"twitter": "handle", "github": "user", "discord": "tag", ...}
    profile_visible BOOLEAN DEFAULT TRUE, -- false = profile hidden from public view

    -- Brand (user flair)
    brand_text VARCHAR(50), -- custom flair text
    brand_style JSONB DEFAULT '{}', -- style overrides from purchased cosmetics

    -- Referral tracking
    referred_by UUID REFERENCES users(id),
    referral_count INTEGER DEFAULT 0,

    -- Privacy
    ip_address_hash VARCHAR(64), -- SHA-256 hash, for spam prevention
    ip_last_seen TIMESTAMP WITH TIME ZONE,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT glow_positive CHECK (post_glow >= 0 AND comment_glow >= 0),
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

### 2. Campfires Table
```sql
CREATE TABLE campfires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- URL slug: f/[name]
    display_name VARCHAR(100) NOT NULL, -- "Technology Discussion"
    description TEXT NOT NULL,

    -- Tender (compiled AI governance prompt)
    tender_name VARCHAR(100) DEFAULT 'The Tender', -- community names their AI
    tender_text TEXT, -- compiled from governance variables (auto-generated, never hand-edited)
    tender_version INTEGER DEFAULT 1,

    -- AI Model Selection (governance proposal changes this)
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    ai_model VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514',

    -- Visual customization
    banner_url VARCHAR(500),
    icon_url VARCHAR(500),
    theme JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),

    -- Stats
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,

    -- Moderation
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT name_format CHECK (name ~ '^[a-z0-9_]+$'),
    CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50)
);

CREATE INDEX idx_campfires_name ON campfires(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_campfires_created_at ON campfires(created_at);
CREATE INDEX idx_campfires_member_count ON campfires(member_count DESC);
```

### 3. Campfire Members Table
```sql
CREATE TABLE campfire_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Community roles
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN (
        'founder', 'moderator', 'vip', 'active_member', 'member', 'lurker'
    )),
    role_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role_assigned_by UUID REFERENCES users(id),

    -- Per-campfire activity tracking (for role auto-assignment)
    post_count_in_campfire INTEGER DEFAULT 0,
    comment_count_in_campfire INTEGER DEFAULT 0,
    glow_earned_in_campfire INTEGER DEFAULT 0,

    UNIQUE(user_id, campfire_id)
);

CREATE INDEX idx_members_user ON campfire_members(user_id);
CREATE INDEX idx_members_campfire ON campfire_members(campfire_id);
CREATE INDEX idx_members_joined ON campfire_members(joined_at);
CREATE INDEX idx_members_role ON campfire_members(campfire_id, role);
CREATE INDEX idx_members_activity ON campfire_members(campfire_id, glow_earned_in_campfire DESC);
```

### 4. Posts Table
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    author_id UUID NOT NULL REFERENCES users(id),

    -- Content
    title VARCHAR(300) NOT NULL,
    body TEXT,
    post_type VARCHAR(10) NOT NULL, -- text, link, image
    url TEXT,
    image_url TEXT,

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

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT post_type_valid CHECK (post_type IN ('text', 'link', 'image')),
    CONSTRAINT title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 300),
    CONSTRAINT body_length CHECK (char_length(body) <= 40000),
    CONSTRAINT votes_positive CHECK (sparks >= 0 AND douses >= 0)
);

CREATE INDEX idx_posts_campfire ON posts(campfire_id) WHERE deleted_at IS NULL AND is_removed = FALSE;
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_hot ON posts((sparks - douses), created_at DESC) WHERE is_removed = FALSE;
CREATE INDEX idx_posts_moderation ON posts(is_approved, moderated_at) WHERE is_approved = FALSE;
```

### 5. Comments Table
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id),
    author_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES comments(id),

    body TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    depth INTEGER DEFAULT 0,

    sparks INTEGER DEFAULT 0,
    douses INTEGER DEFAULT 0,

    is_approved BOOLEAN DEFAULT FALSE,
    is_removed BOOLEAN DEFAULT FALSE,
    removal_reason TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,

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

### 6. Votes Table
```sql
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    votable_type VARCHAR(10) NOT NULL, -- post or comment
    votable_id UUID NOT NULL,
    vote_value SMALLINT NOT NULL, -- 1 (spark) or -1 (douse)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    anonymized BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, votable_type, votable_id),
    CONSTRAINT vote_value_valid CHECK (vote_value IN (-1, 1)),
    CONSTRAINT votable_type_valid CHECK (votable_type IN ('post', 'comment'))
);

CREATE INDEX idx_votes_user ON votes(user_id) WHERE anonymized = FALSE;
CREATE INDEX idx_votes_votable ON votes(votable_type, votable_id);
CREATE INDEX idx_votes_created ON votes(created_at);
```

### 7. Campfire Mod Logs Table (per-campfire AI actions)
```sql
CREATE TABLE campfire_mod_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was moderated
    content_type VARCHAR(10) NOT NULL, -- post or comment
    content_id UUID NOT NULL,
    campfire_id UUID NOT NULL REFERENCES campfires(id),

    -- Who authored it
    author_id UUID NOT NULL REFERENCES users(id),

    -- Decision
    decision VARCHAR(20) NOT NULL, -- approved, removed, flagged, warned
    reason TEXT NOT NULL, -- AI-generated explanation
    confidence NUMERIC(3,2), -- 0.00-1.00

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_model VARCHAR(50),
    tender_version INTEGER,

    -- Appeal
    appealed BOOLEAN DEFAULT FALSE,
    appeal_id UUID,

    CONSTRAINT content_type_valid CHECK (content_type IN ('post', 'comment')),
    CONSTRAINT decision_valid CHECK (decision IN ('approved', 'removed', 'flagged', 'warned'))
);

CREATE INDEX idx_campfire_mod_content ON campfire_mod_logs(content_type, content_id);
CREATE INDEX idx_campfire_mod_campfire ON campfire_mod_logs(campfire_id, created_at DESC);
CREATE INDEX idx_campfire_mod_decision ON campfire_mod_logs(decision, created_at DESC);
```

### 8. Site Mod Logs Table (platform actions on campfires)
```sql
CREATE TABLE site_mod_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was acted on
    target_type VARCHAR(20) NOT NULL, -- campfire, user, post, comment
    target_id UUID NOT NULL,

    -- Action taken
    action VARCHAR(30) NOT NULL, -- ban, unban, remove, warn, escalate, override
    reason TEXT NOT NULL,

    -- Who took the action (system or admin)
    actor_type VARCHAR(20) NOT NULL DEFAULT 'system', -- system, admin, principle_violation
    actor_id UUID, -- NULL for system actions

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT target_type_valid CHECK (target_type IN ('campfire', 'user', 'post', 'comment')),
    CONSTRAINT action_valid CHECK (action IN (
        'ban', 'unban', 'remove', 'warn', 'escalate', 'override', 'quarantine'
    )),
    CONSTRAINT actor_type_valid CHECK (actor_type IN ('system', 'admin', 'principle_violation'))
);

CREATE INDEX idx_site_mod_target ON site_mod_logs(target_type, target_id);
CREATE INDEX idx_site_mod_created ON site_mod_logs(created_at DESC);
CREATE INDEX idx_site_mod_action ON site_mod_logs(action, created_at DESC);
```

### 9. IP Hashes Table
```sql
CREATE TABLE ip_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash VARCHAR(64) NOT NULL,
    salt_version INTEGER NOT NULL DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_count INTEGER DEFAULT 1,

    UNIQUE(ip_hash, salt_version)
);

CREATE INDEX idx_ip_hashes_hash ON ip_hashes(ip_hash);
CREATE INDEX idx_ip_hashes_last_seen ON ip_hashes(last_seen);
```

---

## GOVERNANCE TABLES

### 10. Governance Variables Table (registry)
```sql
CREATE TABLE governance_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL, -- e.g., "toxicity_threshold"
    label VARCHAR(200) NOT NULL, -- "Toxicity Threshold"
    description TEXT,
    category VARCHAR(50) NOT NULL, -- content, behavior, access, identity, meta

    -- Data type and constraints
    data_type VARCHAR(20) NOT NULL, -- boolean, integer, string, text, enum, multi_enum
    enum_options JSONB, -- for enum/multi_enum: ["option1", "option2"]
    min_value INTEGER, -- for integer
    max_value INTEGER, -- for integer
    min_length INTEGER, -- for string/text
    max_length INTEGER, -- for string/text

    -- Default and level
    default_value JSONB NOT NULL, -- JSON-encoded default
    level VARCHAR(20) NOT NULL, -- 'principle' (immutable) or 'campfire' (configurable)
    requires_approval BOOLEAN DEFAULT false, -- needs governance vote to change

    -- Metadata
    constraints JSONB, -- additional validation rules
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT data_type_valid CHECK (data_type IN (
        'boolean', 'integer', 'string', 'text', 'enum', 'multi_enum'
    )),
    CONSTRAINT level_valid CHECK (level IN ('principle', 'campfire'))
);

CREATE INDEX idx_gov_vars_key ON governance_variables(key);
CREATE INDEX idx_gov_vars_category ON governance_variables(category, display_order);
CREATE INDEX idx_gov_vars_level ON governance_variables(level) WHERE is_active = TRUE;
```

### 11. Campfire Settings Table (per-campfire overrides)
```sql
CREATE TABLE campfire_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    variable_id UUID NOT NULL REFERENCES governance_variables(id),
    value JSONB NOT NULL, -- JSON-encoded value

    -- Audit
    changed_by_proposal_id UUID REFERENCES proposals(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(campfire_id, variable_id)
);

CREATE INDEX idx_campfire_settings_campfire ON campfire_settings(campfire_id);
CREATE INDEX idx_campfire_settings_variable ON campfire_settings(variable_id);
```

### 12. Campfire Settings History (audit trail)
```sql
CREATE TABLE campfire_settings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    variable_id UUID NOT NULL REFERENCES governance_variables(id),
    old_value JSONB,
    new_value JSONB NOT NULL,
    proposal_id UUID REFERENCES proposals(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_settings_history_campfire ON campfire_settings_history(campfire_id, changed_at DESC);
CREATE INDEX idx_settings_history_variable ON campfire_settings_history(variable_id, changed_at DESC);
```

### 13. Proposals Table
```sql
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),

    -- Proposal details
    proposal_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- What changes (references governance_variables)
    proposed_changes JSONB NOT NULL,
    -- Format: [{"variable_key": "toxicity_threshold", "new_value": 70}, ...]

    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    discussion_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'discussion',

    -- Results
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    implemented_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT proposal_type_valid CHECK (proposal_type IN (
        'change_setting', 'change_model', 'rename_tender', 'amend_rules'
    )),
    CONSTRAINT status_valid CHECK (status IN (
        'discussion', 'voting', 'passed', 'failed', 'implemented'
    ))
);

CREATE INDEX idx_proposals_campfire ON proposals(campfire_id, status, voting_ends_at);
CREATE INDEX idx_proposals_status ON proposals(status, voting_ends_at);
```

### 14. Proposal Votes Table
```sql
CREATE TABLE proposal_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id),
    user_id UUID NOT NULL REFERENCES users(id),
    vote VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(proposal_id, user_id),
    CONSTRAINT vote_valid CHECK (vote IN ('for', 'against', 'abstain'))
);

CREATE INDEX idx_proposal_votes_proposal ON proposal_votes(proposal_id);
```

---

## GAMIFICATION TABLES

### 15. Badges Table
```sql
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500),
    category VARCHAR(30) NOT NULL,
    rarity VARCHAR(20) NOT NULL,
    version VARCHAR(10) DEFAULT 'v1',
    earn_criteria JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
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
CREATE INDEX idx_badges_active ON badges(is_active) WHERE is_active = TRUE;
```

### 16. User Badges Table
```sql
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id VARCHAR(50) NOT NULL REFERENCES badges(badge_id),
    metadata JSONB DEFAULT '{}',
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_unnotified ON user_badges(user_id) WHERE notified = FALSE;
```

### 17. Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    action_url VARCHAR(500),
    content JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    push_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT type_valid CHECK (type IN (
        'reply_post', 'reply_comment', 'spark', 'mention',
        'campfire_update', 'governance', 'badge_earned',
        'tip_received', 'referral'
    ))
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read = FALSE;
CREATE INDEX idx_notifications_user_all ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_push_pending ON notifications(created_at) WHERE push_sent = FALSE;
```

### 18. Referrals Table
```sql
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referee_id UUID NOT NULL REFERENCES users(id),
    referral_link VARCHAR(100) NOT NULL,
    ip_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(referee_id),
    CONSTRAINT no_self_referral CHECK (referrer_id != referee_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id, created_at DESC);
CREATE INDEX idx_referrals_link ON referrals(referral_link);
CREATE INDEX idx_referrals_ip ON referrals(ip_hash) WHERE ip_hash IS NOT NULL;
```

### 19. Cosmetics Table
```sql
CREATE TABLE cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cosmetic_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    preview_url VARCHAR(500),
    category VARCHAR(20) NOT NULL,
    subcategory VARCHAR(20) NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    metadata JSONB DEFAULT '{}',
    available BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT category_valid CHECK (category IN (
        'theme', 'border', 'title', 'color', 'avatar', 'banner', 'icon'
    )),
    CONSTRAINT subcategory_valid CHECK (subcategory IN ('profile', 'campfire'))
);

CREATE INDEX idx_cosmetics_category ON cosmetics(category, subcategory, sort_order);
CREATE INDEX idx_cosmetics_available ON cosmetics(available, category) WHERE available = TRUE;
```

### 20. User Cosmetics Table
```sql
CREATE TABLE user_cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    cosmetic_id VARCHAR(50) NOT NULL REFERENCES cosmetics(cosmetic_id),
    price_paid_cents INTEGER NOT NULL,
    stripe_payment_id VARCHAR(100),
    refunded BOOLEAN DEFAULT FALSE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, cosmetic_id)
);

CREATE INDEX idx_user_cosmetics_user ON user_cosmetics(user_id, purchased_at DESC);
CREATE INDEX idx_user_cosmetics_stripe ON user_cosmetics(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
```

### 21. Tips Table
```sql
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    stripe_payment_id VARCHAR(100) NOT NULL,
    recurring BOOLEAN DEFAULT FALSE,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT message_length CHECK (message IS NULL OR char_length(message) <= 500)
);

CREATE INDEX idx_tips_user ON tips(user_id, created_at DESC);
CREATE INDEX idx_tips_stripe ON tips(stripe_payment_id);
CREATE INDEX idx_tips_created ON tips(created_at DESC);
```

---

## CHAT TABLES

### 22. Chat Rooms Table
```sql
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Partial unique index: only enforce uniqueness on non-deleted rooms
CREATE UNIQUE INDEX idx_chat_rooms_unique_name
    ON chat_rooms(campfire_id, name) WHERE deleted_at IS NULL;

CREATE INDEX idx_chat_rooms_campfire ON chat_rooms(campfire_id) WHERE deleted_at IS NULL;
```

### 23. Chat Messages Table
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    room_id UUID REFERENCES chat_rooms(id),
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    is_removed BOOLEAN DEFAULT FALSE,
    removal_reason TEXT,

    CONSTRAINT chat_body_length CHECK (char_length(body) >= 1 AND char_length(body) <= 2000)
);

CREATE INDEX idx_chat_campfire_time ON chat_messages(campfire_id, created_at DESC);
CREATE INDEX idx_chat_author ON chat_messages(author_id);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_at DESC) WHERE deleted_at IS NULL;
```

---

### 24. Moderation Appeals Table
```sql
CREATE TABLE moderation_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mod_log_id UUID NOT NULL REFERENCES campfire_mod_logs(id),
    appellant_id UUID NOT NULL REFERENCES users(id),
    appeal_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_reason TEXT,

    CONSTRAINT appeal_length CHECK (char_length(appeal_text) <= 500),
    CONSTRAINT status_valid CHECK (status IN ('pending', 'upheld', 'overturned'))
);

CREATE INDEX idx_appeals_status ON moderation_appeals(status, created_at);
CREATE INDEX idx_appeals_modlog ON moderation_appeals(mod_log_id);
```

---

## ROW-LEVEL SECURITY POLICIES

### Users
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_select_all ON users FOR SELECT USING (true);
CREATE POLICY users_update_own ON users FOR UPDATE
    USING (id = current_setting('app.user_id')::uuid);
```

### Posts
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_select_public ON posts FOR SELECT
    USING (is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL);
CREATE POLICY posts_insert_own ON posts FOR INSERT
    WITH CHECK (author_id = current_setting('app.user_id')::uuid);
CREATE POLICY posts_update_own ON posts FOR UPDATE
    USING (author_id = current_setting('app.user_id')::uuid);
```

### Votes
```sql
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY votes_select_own ON votes FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);
CREATE POLICY votes_insert_own ON votes FOR INSERT
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);
```

### Mod Logs (public transparency)
```sql
ALTER TABLE campfire_mod_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY campfire_mod_select_all ON campfire_mod_logs FOR SELECT USING (true);

ALTER TABLE site_mod_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_mod_select_all ON site_mod_logs FOR SELECT USING (true);
```

### Governance (public)
```sql
ALTER TABLE governance_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY gov_vars_select_all ON governance_variables FOR SELECT USING (true);

ALTER TABLE campfire_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY campfire_settings_select_all ON campfire_settings FOR SELECT USING (true);

ALTER TABLE campfire_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_history_select_all ON campfire_settings_history FOR SELECT USING (true);
```

### Chat (public read, authenticated write)
```sql
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_select_all ON chat_messages
    FOR SELECT USING (true);

CREATE POLICY chat_insert_auth ON chat_messages
    FOR INSERT WITH CHECK (
        author_id = current_setting('app.current_user_id', true)::uuid
    );
```

### Badges (public catalog, public awards)
```sql
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY badges_select_all ON badges FOR SELECT USING (true);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_badges_select_all ON user_badges FOR SELECT USING (true);
```

### Private Tables
```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON notifications FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);
CREATE POLICY notifications_update_own ON notifications FOR UPDATE
    USING (user_id = current_setting('app.user_id')::uuid);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY referrals_select_own ON referrals FOR SELECT
    USING (referrer_id = current_setting('app.user_id')::uuid);

ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY cosmetics_select_all ON cosmetics FOR SELECT USING (available = TRUE);

ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_cosmetics_select_own ON user_cosmetics FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY tips_select_own ON tips FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

ALTER TABLE campfire_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_select_all ON campfire_members FOR SELECT USING (true);
CREATE POLICY members_insert_own ON campfire_members FOR INSERT
    WITH CHECK (user_id = current_setting('app.user_id')::uuid);
CREATE POLICY members_delete_own ON campfire_members FOR DELETE
    USING (user_id = current_setting('app.user_id')::uuid);
```

---

## TRIGGERS

### Auto-update Timestamps
```sql
CREATE OR REPLACE FUNCTION update_edited_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.edited_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_edited_at BEFORE UPDATE ON posts
    FOR EACH ROW
    WHEN (OLD.body IS DISTINCT FROM NEW.body OR OLD.title IS DISTINCT FROM NEW.title)
    EXECUTE FUNCTION update_edited_at();

CREATE TRIGGER comments_edited_at BEFORE UPDATE ON comments
    FOR EACH ROW
    WHEN (OLD.body IS DISTINCT FROM NEW.body)
    EXECUTE FUNCTION update_edited_at();
```

### Campfire Member Count
```sql
CREATE OR REPLACE FUNCTION update_campfire_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE campfires SET member_count = member_count + 1 WHERE id = NEW.campfire_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE campfires SET member_count = member_count - 1 WHERE id = OLD.campfire_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_count_trigger
    AFTER INSERT OR DELETE ON campfire_members
    FOR EACH ROW EXECUTE FUNCTION update_campfire_member_count();
```

### Referral Count
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
    FOR EACH ROW EXECUTE FUNCTION update_referral_count();
```

### Post Count + Membership Activity
```sql
CREATE OR REPLACE FUNCTION update_campfire_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_approved = TRUE THEN
        UPDATE campfires SET post_count = post_count + 1 WHERE id = NEW.campfire_id;
        UPDATE campfire_members
        SET post_count_in_campfire = post_count_in_campfire + 1
        WHERE user_id = NEW.author_id AND campfire_id = NEW.campfire_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_campfire_count_trigger
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION update_campfire_post_count();

CREATE OR REPLACE FUNCTION update_membership_activity_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_campfire_id UUID;
BEGIN
    SELECT campfire_id INTO v_campfire_id FROM posts WHERE id = NEW.post_id;
    IF NEW.is_approved = TRUE AND v_campfire_id IS NOT NULL THEN
        UPDATE campfire_members
        SET comment_count_in_campfire = comment_count_in_campfire + 1
        WHERE user_id = NEW.author_id AND campfire_id = v_campfire_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_membership_activity
    AFTER INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION update_membership_activity_comment();
```

### Tender Recompile on Settings Change
```sql
-- Application-layer trigger: when campfire_settings changes,
-- recompile the Tender and update campfires.tender_text + tender_version.
-- This is NOT a DB trigger — it's handled in /lib/moderation/tender-compiler.ts
-- to keep compilation logic in TypeScript, not plpgsql.
```

---

## SEED DATA

### Governance Variables (initial set)
```sql
INSERT INTO governance_variables (key, label, description, category, data_type, default_value, level, min_value, max_value, display_order) VALUES
-- Content moderation
('toxicity_threshold', 'Toxicity Threshold', 'How sensitive the AI is to toxic content (0=permissive, 100=strict)', 'content', 'integer', '50', 'campfire', 0, 100, 1),
('spam_sensitivity', 'Spam Detection', 'How aggressively spam is detected', 'content', 'enum', '"medium"', 'campfire', NULL, NULL, 2),
('self_promotion_policy', 'Self-Promotion Policy', 'How self-promotional content is handled', 'content', 'enum', '"flag"', 'campfire', NULL, NULL, 3),
('link_sharing', 'Link Sharing', 'Whether links are allowed in posts', 'content', 'enum', '"allow"', 'campfire', NULL, NULL, 4),
('nsfw_allowed', 'NSFW Content', 'Whether NSFW content is permitted', 'content', 'boolean', 'false', 'campfire', NULL, NULL, 5),

-- Access controls
('min_account_age_days', 'Minimum Account Age', 'Days old an account must be to post', 'access', 'integer', '0', 'campfire', 0, 365, 10),
('min_glow_to_post', 'Minimum Glow to Post', 'Minimum glow score required to create posts', 'access', 'integer', '0', 'campfire', 0, 10000, 11),
('min_glow_to_vote', 'Minimum Glow to Vote', 'Minimum glow score required to vote on governance', 'access', 'integer', '0', 'campfire', 0, 10000, 12),

-- Governance
('voting_type', 'Voting Type', 'How governance votes are tallied', 'meta', 'enum', '"simple_majority"', 'campfire', NULL, NULL, 20),
('quorum_percentage', 'Quorum %', 'Minimum voter turnout for valid proposal', 'meta', 'integer', '10', 'campfire', 5, 75, 21),
('proposal_discussion_hours', 'Discussion Period', 'Hours proposals stay in discussion before voting', 'meta', 'integer', '48', 'campfire', 24, 336, 22),
('proposal_voting_hours', 'Voting Period', 'Hours the voting window stays open', 'meta', 'integer', '168', 'campfire', 24, 336, 23),

-- Identity
('tender_name', 'AI Agent Name', 'What the campfire calls its AI moderator', 'identity', 'string', '"The Tender"', 'campfire', NULL, NULL, 30),
('campfire_description', 'Community Description', 'Free-text campfire description (treated as untrusted in Tender)', 'identity', 'text', '""', 'campfire', NULL, NULL, 31),
('custom_rules', 'Custom Rules', 'Free-text community rules (treated as untrusted in Tender)', 'identity', 'text', '""', 'campfire', NULL, NULL, 32),
('keyword_block_list', 'Blocked Keywords', 'Words that auto-remove content', 'content', 'multi_enum', '[]', 'campfire', NULL, NULL, 6),
('keyword_flag_list', 'Flagged Keywords', 'Words that flag content for review', 'content', 'multi_enum', '[]', 'campfire', NULL, NULL, 7);

-- Set enum options for enum-type variables
UPDATE governance_variables SET enum_options = '["low", "medium", "high", "maximum"]' WHERE key = 'spam_sensitivity';
UPDATE governance_variables SET enum_options = '["allow", "flag", "remove"]' WHERE key = 'self_promotion_policy';
UPDATE governance_variables SET enum_options = '["allow", "flag", "remove"]' WHERE key = 'link_sharing';
UPDATE governance_variables SET enum_options = '["simple_majority", "supermajority", "unanimous"]' WHERE key = 'voting_type';
```

### Badge Definitions
```sql
INSERT INTO badges (badge_id, name, description, category, rarity, earn_criteria, sort_order) VALUES
('v1_founder', 'V1 Founder', 'One of the first 5000 fuega.ai users', 'founder', 'legendary', '{"type": "founder", "max_users": 5000}', 1),
('early_adopter', 'Early Adopter', 'Joined fuega.ai in the first month', 'founder', 'epic', '{"type": "account_age_before", "before_date": "2026-04-01"}', 2),
('first_post', 'First Spark', 'Created your first post', 'engagement', 'common', '{"type": "post_count", "min_posts": 1}', 1),
('prolific_poster', 'Prolific Poster', 'Created 100+ posts', 'engagement', 'rare', '{"type": "post_count", "min_posts": 100}', 2),
('conversation_starter', 'Conversation Starter', '10+ posts with 10+ comments each', 'engagement', 'uncommon', '{"type": "engaging_posts", "min_posts": 10, "min_comments_per": 10}', 3),
('first_comment', 'Commentator', 'Left your first comment', 'engagement', 'common', '{"type": "comment_count", "min_comments": 1}', 4),
('prolific_commenter', 'Voice of the Community', 'Left 500+ comments', 'engagement', 'rare', '{"type": "comment_count", "min_comments": 500}', 5),
('glow_100', 'Spark Collector', 'Earned 100+ glow', 'contribution', 'common', '{"type": "glow", "min_score": 100}', 1),
('glow_1000', 'Flame Keeper', 'Earned 1000+ glow', 'contribution', 'uncommon', '{"type": "glow", "min_score": 1000}', 2),
('glow_10000', 'Inferno', 'Earned 10000+ glow', 'contribution', 'epic', '{"type": "glow", "min_score": 10000}', 3),
('campfire_founder', 'Campfire Builder', 'Founded a campfire', 'contribution', 'uncommon', '{"type": "campfire_founder", "min_campfires": 1}', 4),
('governance_voter', 'Civic Duty', 'Voted on 10+ governance proposals', 'governance', 'common', '{"type": "governance_participation", "min_votes": 10}', 1),
('governance_proposer', 'Proposal Writer', 'Created 5+ governance proposals', 'governance', 'uncommon', '{"type": "governance_proposals", "min_proposals": 5}', 2),
('v1_ambassador', 'Ambassador', 'Referred 5+ users', 'referral', 'uncommon', '{"type": "referral_count", "min_referrals": 5}', 1),
('v1_influencer', 'Influencer', 'Referred 25+ users', 'referral', 'rare', '{"type": "referral_count", "min_referrals": 25}', 2),
('v1_legend', 'Legend', 'Referred 100+ users', 'referral', 'legendary', '{"type": "referral_count", "min_referrals": 100}', 3),
('supporter', 'Supporter', 'Made a tip to support fuega.ai', 'special', 'uncommon', '{"type": "tip", "any_amount": true}', 1),
('generous_supporter', 'Generous Supporter', 'Tipped $50+ total', 'special', 'rare', '{"type": "tip_total", "min_cents": 5000}', 2),
('one_year', 'Anniversary', 'Member for 1+ year', 'special', 'uncommon', '{"type": "account_age", "min_days": 365}', 3);
```

---

## CRON JOBS

| Job | Frequency | Description |
|-----|-----------|-------------|
| Badge eligibility check | Hourly | Award badges to qualifying users |
| Notification cleanup | Weekly | Delete read notifications > 30 days |
| Vote anonymization | Daily | Anonymize votes > 24 hours old |
| IP hash cleanup | Daily | Delete IP hashes > 30 days old |
| Role auto-assignment | Daily | Update campfire member roles based on activity |

---

## SECURITY CONSIDERATIONS

- **Passwords:** bcrypt, 12 rounds, unique salt per user
- **IPs:** SHA-256 hash only, 30-day retention, then deleted
- **Financial:** Stripe handles PCI compliance, only payment IDs stored
- **SQL injection:** Parameterized queries only, never concatenate user input
- **Anonymization:** Votes anonymized after 24 hours
- **Governance text fields:** `text` type variables (custom_rules, campfire_description) treated as untrusted in Tender compilation — wrapped in security sandwich

---

**Schema Version:** 3.0
**Total Tables:** 24
**Total Indexes:** 50+
**Total Triggers:** 6
**Total RLS Policies:** 20+
