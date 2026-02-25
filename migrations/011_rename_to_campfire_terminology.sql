-- ============================================
-- FUEGA.AI — 011_rename_to_campfire_terminology.sql
-- Renames tables and columns from old terminology
-- (communities → campfires). Column renames for
-- post_sparks/comment_sparks already handled by 009.
-- ============================================

-- 1. Rename tables
ALTER TABLE communities RENAME TO campfires;
ALTER TABLE community_memberships RENAME TO campfire_members;
ALTER TABLE moderation_log RENAME TO campfire_mod_logs;

-- 2. Rename FK columns: community_id → campfire_id
ALTER TABLE campfire_members RENAME COLUMN community_id TO campfire_id;
ALTER TABLE posts RENAME COLUMN community_id TO campfire_id;
ALTER TABLE proposals RENAME COLUMN community_id TO campfire_id;
ALTER TABLE campfire_mod_logs RENAME COLUMN community_id TO campfire_id;
ALTER TABLE council_members RENAME COLUMN community_id TO campfire_id;

-- 3. Update entity_type data first, then add constraint
ALTER TABLE ai_prompt_history DROP CONSTRAINT IF EXISTS entity_type_valid;
UPDATE ai_prompt_history SET entity_type = 'campfire' WHERE entity_type = 'community';
ALTER TABLE ai_prompt_history ADD CONSTRAINT entity_type_valid
  CHECK (entity_type IN ('campfire', 'platform'));

-- 4. Update agent_level data first, then add constraint
ALTER TABLE campfire_mod_logs DROP CONSTRAINT IF EXISTS agent_level_valid;
UPDATE campfire_mod_logs SET agent_level = 'campfire' WHERE agent_level IN ('community', 'cohort', 'category');
ALTER TABLE campfire_mod_logs ADD CONSTRAINT agent_level_valid
  CHECK (agent_level IN ('campfire', 'platform'));

-- 5. Update proposal_type data first, then add constraint
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposal_type_valid;
UPDATE proposals SET proposal_type = 'modify_config' WHERE proposal_type IN ('modify_prompt', 'addendum_prompt');
UPDATE proposals SET proposal_type = 'change_settings' WHERE proposal_type = 'change_category';
ALTER TABLE proposals ADD CONSTRAINT proposal_type_valid
  CHECK (proposal_type IN (
    'modify_config', 'change_settings', 'amend_rules',
    'custom', 'rename_agent'
  ));

-- 6. Rename triggers
ALTER TRIGGER set_communities_updated_at ON campfires RENAME TO set_campfires_updated_at;

-- 7. Rename FK constraint on campfire_mod_logs
ALTER TABLE campfire_mod_logs RENAME CONSTRAINT fk_moderation_log_appeal TO fk_campfire_mod_logs_appeal;

-- 8. Rename RLS policies
ALTER POLICY communities_select_all ON campfires RENAME TO campfires_select_all;
ALTER POLICY communities_insert_auth ON campfires RENAME TO campfires_insert_auth;
ALTER POLICY communities_update_creator ON campfires RENAME TO campfires_update_creator;

ALTER POLICY memberships_select_all ON campfire_members RENAME TO campfire_members_select_all;
ALTER POLICY memberships_insert_own ON campfire_members RENAME TO campfire_members_insert_own;
ALTER POLICY memberships_update_own ON campfire_members RENAME TO campfire_members_update_own;

ALTER POLICY moderation_log_select_all ON campfire_mod_logs RENAME TO campfire_mod_logs_select_all;

-- 9. Rename indexes
ALTER INDEX IF EXISTS idx_communities_name RENAME TO idx_campfires_name;
ALTER INDEX IF EXISTS idx_communities_category RENAME TO idx_campfires_category;
ALTER INDEX IF EXISTS idx_communities_created_at RENAME TO idx_campfires_created_at;
ALTER INDEX IF EXISTS idx_communities_member_count RENAME TO idx_campfires_member_count;

ALTER INDEX IF EXISTS idx_memberships_user RENAME TO idx_campfire_members_user;
ALTER INDEX IF EXISTS idx_memberships_community RENAME TO idx_campfire_members_campfire;
ALTER INDEX IF EXISTS idx_memberships_joined RENAME TO idx_campfire_members_joined;

ALTER INDEX IF EXISTS idx_posts_community_hot RENAME TO idx_posts_campfire_hot;
ALTER INDEX IF EXISTS idx_posts_community RENAME TO idx_posts_campfire;

ALTER INDEX IF EXISTS idx_proposals_community RENAME TO idx_proposals_campfire;

ALTER INDEX IF EXISTS idx_moderation_content RENAME TO idx_campfire_mod_logs_content;
ALTER INDEX IF EXISTS idx_moderation_community RENAME TO idx_campfire_mod_logs_campfire;
ALTER INDEX IF EXISTS idx_moderation_decision RENAME TO idx_campfire_mod_logs_decision;
