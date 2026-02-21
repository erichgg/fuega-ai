# FUEGA.AI - DATA SCHEMA & STORAGE

**Last Updated:** February 21, 2026  
**Database:** PostgreSQL 15+  
**Strategy:** Single-schema multi-tenant with Row-Level Security (RLS)

---

## SCHEMA DESIGN PHILOSOPHY

### Core Principles
1. **Security First:** RLS policies enforce data isolation
2. **Audit Everything:** All moderation and governance actions logged
3. **Immutable History:** Soft deletes, never hard deletes
4. **Performance:** Optimized indexes for common queries
5. **Scalability:** Designed for 1M+ posts, 10M+ comments

### Multi-Tenancy Approach
- **Single database, single schema** (cost-effective, manageable)
- **Community isolation via RLS policies**
- **No tenant_id needed** (communities are the organizational unit)
- **Shared infrastructure** with logical separation

---

## DATABASE SCHEMA

### Users Table
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
    
    -- Founder badge
    founder_badge_number INTEGER UNIQUE, -- 1-5000, null for non-founders
    
    -- Privacy
    ip_address_hash VARCHAR(64), -- SHA-256 hash, for spam prevention
    ip_last_seen TIMESTAMP WITH TIME ZONE,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT sparks_positive CHECK (post_sparks >= 0 AND comment_sparks >= 0)
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_founder_badge ON users(founder_badge_number) WHERE founder_badge_number IS NOT NULL;
CREATE INDEX idx_users_ip_hash ON users(ip_address_hash) WHERE ip_address_hash IS NOT NULL;
```

### Communities Table
```sql
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g., "technology", "politics"
    display_name VARCHAR(100) NOT NULL, -- e.g., "Technology Discussion"
    description TEXT NOT NULL,
    
    -- AI Moderation
    ai_prompt TEXT NOT NULL, -- The active moderation prompt
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

### Categories Table
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

### Community Memberships Table
```sql
CREATE TABLE community_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Role (for future: moderators, etc.)
    role VARCHAR(20) DEFAULT 'member', -- member, moderator, admin
    
    UNIQUE(user_id, community_id)
);

CREATE INDEX idx_memberships_user ON community_memberships(user_id);
CREATE INDEX idx_memberships_community ON community_memberships(community_id);
CREATE INDEX idx_memberships_joined ON community_memberships(joined_at);
```

### Posts Table
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

### Comments Table
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

### Votes Table
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

### AI Prompt History Table
```sql
CREATE TABLE ai_prompt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL, -- community, category, platform
    entity_id UUID, -- community_id or category_id (NULL for platform)
    
    prompt_text TEXT NOT NULL,
    version INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id), -- NULL for platform changes
    
    -- For governance
    proposal_id UUID REFERENCES proposals(id),
    
    CONSTRAINT entity_type_valid CHECK (entity_type IN ('community', 'category', 'platform'))
);

CREATE INDEX idx_prompt_history_entity ON ai_prompt_history(entity_type, entity_id, version DESC);
```

### Moderation Log Table
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
    CONSTRAINT agent_level_valid CHECK (agent_level IN ('community', 'category', 'platform')),
    CONSTRAINT decision_valid CHECK (decision IN ('approved', 'removed', 'flagged', 'warned'))
);

CREATE INDEX idx_moderation_content ON moderation_log(content_type, content_id);
CREATE INDEX idx_moderation_community ON moderation_log(community_id, created_at DESC);
CREATE INDEX idx_moderation_decision ON moderation_log(decision, created_at DESC);
```

### Moderation Appeals Table
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

### Proposals Table
```sql
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id),
    
    -- Proposal details
    proposal_type VARCHAR(30) NOT NULL, -- modify_prompt, change_settings, elect_council, etc.
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- What changes
    proposed_changes JSONB NOT NULL, -- Flexible structure for different proposal types
    
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
        'modify_prompt', 'addendum_prompt', 'change_settings', 'elect_council', 
        'remove_moderator', 'amend_rules', 'change_category'
    )),
    CONSTRAINT status_valid CHECK (status IN (
        'discussion', 'voting', 'passed', 'failed', 'implemented'
    ))
);

CREATE INDEX idx_proposals_community ON proposals(community_id, status, voting_ends_at);
CREATE INDEX idx_proposals_status ON proposals(status, voting_ends_at);
```

### Proposal Votes Table
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

### Council Members Table
```sql
CREATE TABLE council_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    term_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    term_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT unique_active_council UNIQUE(category_id, community_id) WHERE is_active = TRUE
);

CREATE INDEX idx_council_category ON council_members(category_id, is_active);
CREATE INDEX idx_council_term ON council_members(term_end) WHERE is_active = TRUE;
```

---

## ROW-LEVEL SECURITY POLICIES

### Principle
- Users can only see/modify their own data
- Public data (posts, comments) visible to all
- Moderation logs public to all
- Governance visible to community members

### Example Policies

```sql
-- Users can only update their own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_all ON users
    FOR SELECT
    USING (true); -- All users visible for attribution

CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (id = current_setting('app.user_id')::uuid);

-- Posts visible if approved and not removed
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

-- Votes are private (only user can see their own)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY votes_select_own ON votes
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

-- Moderation log is public (transparency)
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_log_select_all ON moderation_log
    FOR SELECT
    USING (true);
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
```

---

## DATA PARTITIONING (Future)

### Considerations for Scale
When we hit 10M+ posts, consider:
- **Partitioning by created_at** (monthly or yearly)
- **Separate hot/cold storage** (old posts to archive)
- **Read replicas** for vote counting, karma calculation

```sql
-- Example: Partition posts by year
CREATE TABLE posts_2026 PARTITION OF posts
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE posts_2027 PARTITION OF posts
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

---

## BACKUP & RECOVERY

### Backup Strategy
- **Full backups:** Daily at 2AM UTC
- **Incremental backups:** Every 6 hours
- **WAL archiving:** Continuous (for point-in-time recovery)
- **Retention:** 30 days full, 7 days incremental

### Critical Tables (Priority Backup)
1. users
2. posts
3. comments
4. moderation_log (NEVER lose transparency)
5. proposals
6. communities

### Recovery SLA
- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 6 hours max data loss

---

## DATA MIGRATION

### From Existing agent-business DB
```sql
-- 1. Backup existing data
pg_dump -U postgres -d agent_business > backup.sql

-- 2. Create new schema
psql -U postgres -d agent_business -f schema.sql

-- 3. Migrate users if any exist
INSERT INTO users (username, password_hash, created_at)
SELECT username, password_hash, created_at
FROM old_users_table;

-- 4. Drop old tables
DROP TABLE IF EXISTS old_users_table, old_posts_table, etc;
```

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

-- Database size
SELECT pg_size_pretty(pg_database_size('agent_business'));

-- Slowest queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## SECURITY CONSIDERATIONS

### Password Storage
- **Algorithm:** bcrypt
- **Work factor:** 12 rounds (increases with Moore's Law)
- **Salt:** Unique per user (automatic with bcrypt)

### IP Address Handling
- **Storage:** SHA-256 hash only (not raw IP)
- **Purpose:** Spam/bot prevention
- **Retention:** 30 days, then deleted
- **Querying:** Hash incoming IP and compare

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

---

## NEXT STEPS

1. **Create database** in Railway/existing PostgreSQL
2. **Run schema.sql** to create all tables
3. **Apply RLS policies** 
4. **Create indexes** for performance
5. **Set up backups** 
6. **Write seed data** for testing
7. **Document API queries** for each endpoint

---

**Schema Version:** 1.0  
**Last Migration:** N/A (initial schema)  
**Next Review:** After v1 launch
