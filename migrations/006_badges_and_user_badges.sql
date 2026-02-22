-- ============================================
-- FUEGA.AI — 006_badges_and_user_badges.sql
-- V2: Badges catalog + user badge awards
-- ADDITIVE ONLY — no drops, no deletes
-- ============================================

-- ============================================
-- 1. BADGES TABLE (system-managed catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS badges (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT category_valid CHECK (category IN (
        'founder', 'engagement', 'contribution', 'governance', 'referral', 'special'
    )),
    CONSTRAINT rarity_valid CHECK (rarity IN (
        'common', 'uncommon', 'rare', 'epic', 'legendary'
    ))
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active) WHERE is_active = TRUE;

-- ============================================
-- 2. USER BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id VARCHAR(50) NOT NULL REFERENCES badges(badge_id),
    metadata JSONB DEFAULT '{}',
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_check ON user_badges(user_id, badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_unnotified ON user_badges(user_id) WHERE notified = FALSE;

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY badges_select_all ON badges
    FOR SELECT
    USING (true);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_badges_select_all ON user_badges
    FOR SELECT
    USING (true);

-- ============================================
-- 4. SEED ALL 40 BADGE DEFINITIONS
-- ============================================
INSERT INTO badges (badge_id, name, description, category, rarity, version, earn_criteria, sort_order) VALUES

-- FOUNDER BADGES (3)
('v1_founder', 'V1 Founder', 'One of the first 5,000 users to join fuega.ai. Numbered #1 through #5,000.', 'founder', 'legendary', 'v1', '{"type": "one_time", "metric": "signup_order", "threshold": 5000}', 1),
('v1_alpha_tester', 'Alpha Tester', 'Participated in the fuega.ai alpha testing phase (first 100 users).', 'founder', 'legendary', 'v1', '{"type": "one_time", "metric": "signup_order", "threshold": 100}', 2),
('v1_beta_tester', 'Beta Tester', 'Participated in the fuega.ai closed beta (users #101 through #500).', 'founder', 'epic', 'v1', '{"type": "one_time", "metric": "signup_order", "threshold": 500}', 3),

-- ENGAGEMENT BADGES (13)
('first_post', 'First Flame', 'Published your first post on fuega.ai.', 'engagement', 'common', 'v1', '{"type": "threshold", "metric": "total_posts", "threshold": 1}', 1),
('prolific_poster', 'Prolific Poster', 'Published 50 approved posts across any communities.', 'engagement', 'uncommon', 'v1', '{"type": "threshold", "metric": "total_approved_posts", "threshold": 50}', 2),
('posting_machine', 'Posting Machine', 'Published 500 approved posts across any communities.', 'engagement', 'rare', 'v1', '{"type": "threshold", "metric": "total_approved_posts", "threshold": 500}', 3),
('first_comment', 'Sparked a Conversation', 'Left your first comment on fuega.ai.', 'engagement', 'common', 'v1', '{"type": "threshold", "metric": "total_comments", "threshold": 1}', 4),
('conversationalist', 'Conversationalist', 'Left 100 approved comments across any posts.', 'engagement', 'uncommon', 'v1', '{"type": "threshold", "metric": "total_approved_comments", "threshold": 100}', 5),
('discussion_veteran', 'Discussion Veteran', 'Left 1,000 approved comments across any posts.', 'engagement', 'rare', 'v1', '{"type": "threshold", "metric": "total_approved_comments", "threshold": 1000}', 6),
('community_explorer', 'Community Explorer', 'Joined 10 different communities.', 'engagement', 'common', 'v1', '{"type": "threshold", "metric": "communities_joined", "threshold": 10}', 7),
('community_nomad', 'Community Nomad', 'Joined 50 different communities.', 'engagement', 'uncommon', 'v1', '{"type": "threshold", "metric": "communities_joined", "threshold": 50}', 8),
('night_owl', 'Night Owl', 'Made 25 posts or comments between midnight and 5 AM (UTC).', 'engagement', 'uncommon', 'v1', '{"type": "threshold", "metric": "nighttime_activity_count", "threshold": 25}', 9),
('streak_7', 'Weekly Streak', 'Posted or commented every day for 7 consecutive days.', 'engagement', 'common', 'v1', '{"type": "threshold", "metric": "consecutive_active_days", "threshold": 7}', 10),
('streak_30', 'Monthly Streak', 'Posted or commented every day for 30 consecutive days.', 'engagement', 'rare', 'v1', '{"type": "threshold", "metric": "consecutive_active_days", "threshold": 30}', 11),
('streak_365', 'Annual Inferno', 'Posted or commented every day for 365 consecutive days.', 'engagement', 'legendary', 'v1', '{"type": "threshold", "metric": "consecutive_active_days", "threshold": 365}', 12),
('one_year_member', 'One Year Strong', 'Account has been active for one full year.', 'engagement', 'uncommon', 'v1', '{"type": "threshold", "metric": "account_age_days", "threshold": 365}', 13),

-- CONTRIBUTION BADGES (9)
('first_spark_received', 'First Spark', 'Received your first spark on a post or comment.', 'contribution', 'common', 'v1', '{"type": "threshold", "metric": "total_sparks_received", "threshold": 1}', 1),
('spark_collector', 'Spark Collector', 'Received 100 total sparks across all your content.', 'contribution', 'uncommon', 'v1', '{"type": "threshold", "metric": "total_sparks_received", "threshold": 100}', 2),
('spark_magnet', 'Spark Magnet', 'Received 1,000 total sparks across all your content.', 'contribution', 'rare', 'v1', '{"type": "threshold", "metric": "total_sparks_received", "threshold": 1000}', 3),
('inferno_contributor', 'Inferno Contributor', 'Received 10,000 total sparks across all your content.', 'contribution', 'epic', 'v1', '{"type": "threshold", "metric": "total_sparks_received", "threshold": 10000}', 4),
('legendary_contributor', 'Legendary Contributor', 'Received 100,000 total sparks across all your content.', 'contribution', 'legendary', 'v1', '{"type": "threshold", "metric": "total_sparks_received", "threshold": 100000}', 5),
('hot_post', 'Hot Post', 'Had a single post reach 100 sparks.', 'contribution', 'rare', 'v1', '{"type": "threshold", "metric": "max_post_sparks", "threshold": 100}', 6),
('viral_post', 'Viral Post', 'Had a single post reach 1,000 sparks.', 'contribution', 'epic', 'v1', '{"type": "threshold", "metric": "max_post_sparks", "threshold": 1000}', 7),
('community_builder', 'Community Builder', 'Created a community that reached 100 members.', 'contribution', 'rare', 'v1', '{"type": "threshold", "metric": "max_community_members_created", "threshold": 100}', 8),
('community_architect', 'Community Architect', 'Created a community that reached 1,000 members.', 'contribution', 'epic', 'v1', '{"type": "threshold", "metric": "max_community_members_created", "threshold": 1000}', 9),

-- GOVERNANCE BADGES (6)
('first_vote', 'Civic Duty', 'Cast your first vote on a governance proposal.', 'governance', 'common', 'v1', '{"type": "threshold", "metric": "total_proposal_votes", "threshold": 1}', 1),
('active_voter', 'Active Voter', 'Cast votes on 25 governance proposals.', 'governance', 'uncommon', 'v1', '{"type": "threshold", "metric": "total_proposal_votes", "threshold": 25}', 2),
('proposal_author', 'Proposal Author', 'Created your first governance proposal.', 'governance', 'uncommon', 'v1', '{"type": "threshold", "metric": "total_proposals_created", "threshold": 1}', 3),
('successful_proposer', 'Successful Proposer', 'Authored a governance proposal that passed community vote.', 'governance', 'rare', 'v1', '{"type": "threshold", "metric": "total_proposals_passed", "threshold": 1}', 4),
('governance_champion', 'Governance Champion', 'Authored 10 governance proposals that passed community vote.', 'governance', 'epic', 'v1', '{"type": "threshold", "metric": "total_proposals_passed", "threshold": 10}', 5),
('council_member', 'Council Member', 'Elected to serve on a category council.', 'governance', 'rare', 'v1', '{"type": "one_time", "metric": "council_membership", "threshold": 1}', 6),

-- REFERRAL BADGES (4)
('first_referral', 'Spark Spreader', 'Referred your first user to fuega.ai.', 'referral', 'common', 'v1', '{"type": "referral_count", "metric": "referral_count", "threshold": 1}', 1),
('v1_ambassador', 'V1 Ambassador', 'Referred 5 or more users who successfully created accounts on fuega.ai.', 'referral', 'uncommon', 'v1', '{"type": "referral_count", "metric": "referral_count", "threshold": 5}', 2),
('v1_influencer', 'V1 Influencer', 'Referred 25 or more users who successfully created accounts on fuega.ai.', 'referral', 'rare', 'v1', '{"type": "referral_count", "metric": "referral_count", "threshold": 25}', 3),
('v1_legend', 'V1 Legend', 'Referred 100 or more users who successfully created accounts on fuega.ai.', 'referral', 'legendary', 'v1', '{"type": "referral_count", "metric": "referral_count", "threshold": 100}', 4),

-- SPECIAL BADGES (5)
('supporter', 'Supporter', 'Made a donation to the fuega.ai tip jar to help keep the platform running.', 'special', 'rare', 'v1', '{"type": "one_time", "metric": "tip_amount_cents", "threshold": 1}', 1),
('recurring_supporter', 'Recurring Supporter', 'Set up a recurring monthly donation to the fuega.ai tip jar.', 'special', 'epic', 'v1', '{"type": "one_time", "metric": "recurring_tip", "threshold": 1}', 2),
('bug_hunter', 'Bug Hunter', 'Reported a verified bug or security vulnerability through the official channels.', 'special', 'rare', 'v1', '{"type": "manual", "metric": "admin_award", "threshold": 1}', 3),
('community_creator', 'Community Creator', 'Created your first community on fuega.ai.', 'special', 'uncommon', 'v1', '{"type": "threshold", "metric": "communities_created", "threshold": 1}', 4),
('verified_human', 'Verified Human', 'Passed an additional verification step to prove human status.', 'special', 'uncommon', 'v1', '{"type": "manual", "metric": "admin_verification", "threshold": 1}', 5)

ON CONFLICT (badge_id) DO NOTHING;
