-- ============================================
-- FUEGA.AI — 002_rls_policies.sql
-- Row-Level Security on all 13 tables
-- ============================================
-- App sets: SET LOCAL app.user_id = '<uuid>' per request
-- Service role bypasses RLS via: SET ROLE fuega_service

-- ============================================
-- SERVICE ROLE (bypasses RLS for system operations)
-- ============================================
-- Note: If running as superuser/owner, RLS is bypassed by default.
-- For app connections, create a restricted role:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fuega_app') THEN
        CREATE ROLE fuega_app NOLOGIN;
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO fuega_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO fuega_app;

-- ============================================
-- 1. USERS — public read, own update only
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_all ON users
    FOR SELECT USING (true);

CREATE POLICY users_insert_own ON users
    FOR INSERT WITH CHECK (true); -- registration is open

CREATE POLICY users_update_own ON users
    FOR UPDATE USING (
        id = current_setting('app.user_id', true)::uuid
    );

-- ============================================
-- 2. CATEGORIES — public read, admin write
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_select_all ON categories
    FOR SELECT USING (true);

CREATE POLICY categories_insert_admin ON categories
    FOR INSERT WITH CHECK (
        current_setting('app.user_role', true) = 'admin'
    );

CREATE POLICY categories_update_admin ON categories
    FOR UPDATE USING (
        current_setting('app.user_role', true) = 'admin'
    );

-- ============================================
-- 3. COMMUNITIES — public read, creator/admin write
-- ============================================
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY communities_select_all ON communities
    FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY communities_insert_auth ON communities
    FOR INSERT WITH CHECK (
        created_by = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY communities_update_creator ON communities
    FOR UPDATE USING (
        created_by = current_setting('app.user_id', true)::uuid
        OR current_setting('app.user_role', true) = 'admin'
    );

-- ============================================
-- 4. COMMUNITY MEMBERSHIPS — members can read, own join/leave
-- ============================================
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY memberships_select_all ON community_memberships
    FOR SELECT USING (true);

CREATE POLICY memberships_insert_own ON community_memberships
    FOR INSERT WITH CHECK (
        user_id = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY memberships_update_own ON community_memberships
    FOR UPDATE USING (
        user_id = current_setting('app.user_id', true)::uuid
    );

-- ============================================
-- 5. POSTS — public read (approved only), author write
-- ============================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_select_public ON posts
    FOR SELECT USING (
        (is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL)
        OR author_id = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY posts_insert_own ON posts
    FOR INSERT WITH CHECK (
        author_id = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY posts_update_own ON posts
    FOR UPDATE USING (
        author_id = current_setting('app.user_id', true)::uuid
    );

-- ============================================
-- 6. COMMENTS — public read (approved only), author write
-- ============================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_select_public ON comments
    FOR SELECT USING (
        (is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL)
        OR author_id = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY comments_insert_own ON comments
    FOR INSERT WITH CHECK (
        author_id = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY comments_update_own ON comments
    FOR UPDATE USING (
        author_id = current_setting('app.user_id', true)::uuid
    );

-- ============================================
-- 7. VOTES — private (own only)
-- ============================================
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY votes_select_own ON votes
    FOR SELECT USING (
        user_id = current_setting('app.user_id', true)::uuid
        OR anonymized = TRUE  -- anonymized votes visible for counting
    );

CREATE POLICY votes_insert_own ON votes
    FOR INSERT WITH CHECK (
        user_id = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY votes_update_own ON votes
    FOR UPDATE USING (
        user_id = current_setting('app.user_id', true)::uuid
        AND anonymized = FALSE  -- can't change anonymized votes
    );

-- ============================================
-- 8. PROPOSALS — community members can read, author create
-- ============================================
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposals_select_all ON proposals
    FOR SELECT USING (true); -- proposals are public for transparency

CREATE POLICY proposals_insert_member ON proposals
    FOR INSERT WITH CHECK (
        created_by = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY proposals_update_author ON proposals
    FOR UPDATE USING (
        created_by = current_setting('app.user_id', true)::uuid
        AND status = 'discussion'  -- can only edit during discussion
    );

-- ============================================
-- 9. PROPOSAL VOTES — own votes only
-- ============================================
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposal_votes_select_own ON proposal_votes
    FOR SELECT USING (
        user_id = current_setting('app.user_id', true)::uuid
    );

CREATE POLICY proposal_votes_insert_own ON proposal_votes
    FOR INSERT WITH CHECK (
        user_id = current_setting('app.user_id', true)::uuid
    );

-- ============================================
-- 10. MODERATION LOG — public read (transparency)
-- ============================================
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_log_select_all ON moderation_log
    FOR SELECT USING (true);

-- Insert/update only by system (service role bypasses RLS)

-- ============================================
-- 11. MODERATION APPEALS — public read, own create
-- ============================================
ALTER TABLE moderation_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY appeals_select_all ON moderation_appeals
    FOR SELECT USING (true); -- transparency

CREATE POLICY appeals_insert_own ON moderation_appeals
    FOR INSERT WITH CHECK (
        appellant_id = current_setting('app.user_id', true)::uuid
    );

-- ============================================
-- 12. AI PROMPT HISTORY — public read (transparency)
-- ============================================
ALTER TABLE ai_prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY prompt_history_select_all ON ai_prompt_history
    FOR SELECT USING (true);

-- Insert only by system (service role bypasses RLS)

-- ============================================
-- 13. COUNCIL MEMBERS — public read
-- ============================================
ALTER TABLE council_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY council_select_all ON council_members
    FOR SELECT USING (true);

-- Insert/update only by system (governance engine)
