-- ============================================
-- FUEGA.AI — 012_governance_variables.sql
-- Governance variables registry + per-campfire overrides
-- with full audit trail. Data-driven: new variables = DB insert.
-- ============================================

-- ============================================
-- 1. GOVERNANCE VARIABLES (registry)
-- ============================================
CREATE TABLE governance_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    data_type VARCHAR(20) NOT NULL,
    default_value TEXT NOT NULL,
    min_value TEXT,
    max_value TEXT,
    allowed_values TEXT[],           -- for enum/multi_enum types
    level VARCHAR(20) NOT NULL DEFAULT 'campfire',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    requires_proposal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT gv_data_type_valid CHECK (data_type IN (
        'boolean', 'integer', 'string', 'text', 'enum', 'multi_enum'
    )),
    CONSTRAINT gv_level_valid CHECK (level IN ('campfire', 'platform')),
    CONSTRAINT gv_key_format CHECK (key ~ '^[a-z][a-z0-9_]*$')
);

CREATE INDEX idx_gv_category ON governance_variables(category, sort_order);
CREATE INDEX idx_gv_active ON governance_variables(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE governance_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY gv_select_all ON governance_variables FOR SELECT USING (true);

-- ============================================
-- 2. CAMPFIRE SETTINGS (per-campfire overrides)
-- ============================================
CREATE TABLE campfire_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    variable_key VARCHAR(100) NOT NULL REFERENCES governance_variables(key),
    value TEXT NOT NULL,
    set_by UUID REFERENCES users(id),
    set_via VARCHAR(30) DEFAULT 'manual',  -- manual, proposal, system
    proposal_id UUID REFERENCES proposals(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(campfire_id, variable_key)
);

CREATE INDEX idx_cs_campfire ON campfire_settings(campfire_id);
CREATE INDEX idx_cs_variable ON campfire_settings(variable_key);

CREATE TRIGGER set_campfire_settings_updated_at
    BEFORE UPDATE ON campfire_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE campfire_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY cs_select_all ON campfire_settings FOR SELECT USING (true);

-- ============================================
-- 3. CAMPFIRE SETTINGS HISTORY (audit trail)
-- ============================================
CREATE TABLE campfire_settings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    variable_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by UUID REFERENCES users(id),
    change_reason TEXT,
    proposal_id UUID REFERENCES proposals(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csh_campfire ON campfire_settings_history(campfire_id, created_at DESC);
CREATE INDEX idx_csh_variable ON campfire_settings_history(variable_key);

-- RLS
ALTER TABLE campfire_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY csh_select_all ON campfire_settings_history FOR SELECT USING (true);

-- ============================================
-- 4. SEED DEFAULT GOVERNANCE VARIABLES
-- ============================================
INSERT INTO governance_variables (key, display_name, description, data_type, default_value, min_value, max_value, category, sort_order, requires_proposal) VALUES

-- Content Moderation
('toxicity_threshold', 'Toxicity Threshold', 'How strictly to filter toxic content (0=off, 90=max). Platform rules always enforced.', 'integer', '50', '0', '90', 'moderation', 1, true),
('spam_sensitivity', 'Spam Sensitivity', 'How aggressively to filter spam and low-effort content.', 'enum', 'medium', NULL, NULL, 'moderation', 2, true),
('self_promotion_policy', 'Self-Promotion Policy', 'How to handle self-promotional content.', 'enum', 'flag', NULL, NULL, 'moderation', 3, true),
('link_sharing_policy', 'Link Sharing Policy', 'How to handle external links.', 'enum', 'allow', NULL, NULL, 'moderation', 4, true),
('allow_nsfw', 'Allow NSFW Content', 'Whether NSFW content is permitted in this campfire.', 'boolean', 'false', NULL, NULL, 'moderation', 5, true),

-- Content Types
('allowed_post_types', 'Allowed Post Types', 'Which types of posts are allowed.', 'multi_enum', 'text,link,image', NULL, NULL, 'content', 1, true),
('require_english', 'Require English', 'Whether posts must be in English.', 'boolean', 'false', NULL, NULL, 'content', 2, true),

-- User Requirements
('minimum_account_age_days', 'Minimum Account Age (days)', 'How old an account must be to post here.', 'integer', '0', '0', '365', 'access', 1, true),
('minimum_glow', 'Minimum Glow to Post', 'Minimum reputation required to create posts.', 'integer', '0', '0', '10000', 'access', 2, true),

-- Keywords
('blocked_keywords', 'Blocked Keywords', 'Posts containing these words are auto-removed (comma-separated).', 'text', '', NULL, NULL, 'moderation', 10, true),
('flagged_keywords', 'Flagged Keywords', 'Posts containing these words are flagged for review (comma-separated).', 'text', '', NULL, NULL, 'moderation', 11, true),

-- Governance
('config_change_quorum', 'Change Quorum (%)', 'Minimum percentage of members that must vote for a config change to count.', 'integer', '10', '5', '100', 'governance', 1, false),
('config_change_threshold', 'Change Threshold (%)', 'Percentage of votes needed to pass a config change.', 'integer', '66', '51', '100', 'governance', 2, false),
('config_change_voting_days', 'Voting Period (days)', 'How many days a config change vote stays open.', 'integer', '7', '1', '30', 'governance', 3, false),

-- AI Agent
('ai_agent_name', 'AI Agent Name', 'The name for this campfire''s AI moderator.', 'string', 'Guardian', NULL, NULL, 'identity', 1, true),
('ai_agent_personality', 'AI Agent Personality', 'Brief personality description for the AI moderator (sandboxed in security wrapper).', 'text', 'Fair, transparent, and helpful.', NULL, NULL, 'identity', 2, true),
('ai_welcome_message', 'Welcome Message', 'Message shown to new members when they join.', 'text', 'Welcome to the campfire! Please read the rules and be respectful.', NULL, NULL, 'identity', 3, false)

ON CONFLICT (key) DO NOTHING;

-- Set allowed_values for enum types
UPDATE governance_variables SET allowed_values = ARRAY['low', 'medium', 'high']
  WHERE key = 'spam_sensitivity';
UPDATE governance_variables SET allowed_values = ARRAY['block', 'flag', 'allow']
  WHERE key IN ('self_promotion_policy', 'link_sharing_policy');
UPDATE governance_variables SET allowed_values = ARRAY['text', 'link', 'image']
  WHERE key = 'allowed_post_types';
