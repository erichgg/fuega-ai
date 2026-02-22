import { queryOne, queryAll } from "@/lib/db";
import { awardBadges, type AwardResult } from "@/lib/services/badges.service";

// ─── Types ───────────────────────────────────────────────────

interface UserMetrics {
  total_posts: number;
  total_approved_posts: number;
  total_comments: number;
  total_approved_comments: number;
  communities_joined: number;
  total_sparks_received: number;
  max_post_sparks: number;
  consecutive_active_days: number;
  account_age_days: number;
  total_proposal_votes: number;
  total_proposals_created: number;
  total_proposals_passed: number;
  referral_count: number;
  communities_created: number;
  max_community_members_created: number;
  nighttime_activity_count: number;
  founder_number: number | null;
}

interface ThresholdBadge {
  badge_id: string;
  metric: keyof UserMetrics;
  threshold: number;
}

// ─── All threshold-based badges ──────────────────────────────

const THRESHOLD_BADGES: ThresholdBadge[] = [
  // Engagement
  { badge_id: "first_post", metric: "total_posts", threshold: 1 },
  { badge_id: "prolific_poster", metric: "total_approved_posts", threshold: 50 },
  { badge_id: "posting_machine", metric: "total_approved_posts", threshold: 500 },
  { badge_id: "first_comment", metric: "total_comments", threshold: 1 },
  { badge_id: "conversationalist", metric: "total_approved_comments", threshold: 100 },
  { badge_id: "discussion_veteran", metric: "total_approved_comments", threshold: 1000 },
  { badge_id: "community_explorer", metric: "communities_joined", threshold: 10 },
  { badge_id: "community_nomad", metric: "communities_joined", threshold: 50 },
  { badge_id: "night_owl", metric: "nighttime_activity_count", threshold: 25 },
  { badge_id: "streak_7", metric: "consecutive_active_days", threshold: 7 },
  { badge_id: "streak_30", metric: "consecutive_active_days", threshold: 30 },
  { badge_id: "streak_365", metric: "consecutive_active_days", threshold: 365 },
  { badge_id: "one_year_member", metric: "account_age_days", threshold: 365 },

  // Contribution
  { badge_id: "first_spark_received", metric: "total_sparks_received", threshold: 1 },
  { badge_id: "spark_collector", metric: "total_sparks_received", threshold: 100 },
  { badge_id: "spark_magnet", metric: "total_sparks_received", threshold: 1000 },
  { badge_id: "inferno_contributor", metric: "total_sparks_received", threshold: 10000 },
  { badge_id: "legendary_contributor", metric: "total_sparks_received", threshold: 100000 },
  { badge_id: "hot_post", metric: "max_post_sparks", threshold: 100 },
  { badge_id: "viral_post", metric: "max_post_sparks", threshold: 1000 },
  { badge_id: "community_builder", metric: "max_community_members_created", threshold: 100 },
  { badge_id: "community_architect", metric: "max_community_members_created", threshold: 1000 },

  // Governance
  { badge_id: "first_vote", metric: "total_proposal_votes", threshold: 1 },
  { badge_id: "active_voter", metric: "total_proposal_votes", threshold: 25 },
  { badge_id: "proposal_author", metric: "total_proposals_created", threshold: 1 },
  { badge_id: "successful_proposer", metric: "total_proposals_passed", threshold: 1 },
  { badge_id: "governance_champion", metric: "total_proposals_passed", threshold: 10 },

  // Referral
  { badge_id: "first_referral", metric: "referral_count", threshold: 1 },
  { badge_id: "v1_ambassador", metric: "referral_count", threshold: 5 },
  { badge_id: "v1_influencer", metric: "referral_count", threshold: 25 },
  { badge_id: "v1_legend", metric: "referral_count", threshold: 100 },

  // Special
  { badge_id: "community_creator", metric: "communities_created", threshold: 1 },
];

// ─── Fetch all metrics for a user ────────────────────────────

async function getUserMetrics(userId: string): Promise<UserMetrics> {
  // Run all metric queries in parallel for performance
  const [
    postCounts,
    commentCounts,
    communitiesJoined,
    sparksReceived,
    maxPostSparks,
    streakDays,
    accountAge,
    proposalVotes,
    proposalsCreated,
    proposalsPassed,
    referralCount,
    communitiesCreated,
    maxCommunityMembers,
    nightActivity,
    founderInfo,
  ] = await Promise.all([
    // Total posts + approved posts
    queryOne<{ total: string; approved: string }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE is_approved = TRUE AND is_removed = FALSE) AS approved
       FROM posts
       WHERE author_id = $1 AND deleted_at IS NULL`,
      [userId]
    ),

    // Total comments + approved comments
    queryOne<{ total: string; approved: string }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE is_approved = TRUE AND is_removed = FALSE) AS approved
       FROM comments
       WHERE author_id = $1 AND deleted_at IS NULL`,
      [userId]
    ),

    // Communities joined (active memberships)
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM community_members
       WHERE user_id = $1 AND left_at IS NULL`,
      [userId]
    ),

    // Total sparks received (post_sparks + comment_sparks from users table)
    queryOne<{ post_sparks: number; comment_sparks: number }>(
      `SELECT post_sparks, comment_sparks
       FROM users WHERE id = $1`,
      [userId]
    ),

    // Max sparks on any single post
    queryOne<{ max_sparks: string }>(
      `SELECT COALESCE(MAX(sparks), 0) AS max_sparks
       FROM posts
       WHERE author_id = $1 AND deleted_at IS NULL AND is_approved = TRUE`,
      [userId]
    ),

    // Consecutive active days (current streak)
    queryOne<{ streak: string }>(
      `WITH daily_activity AS (
         SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') AS active_date
         FROM (
           SELECT created_at FROM posts WHERE author_id = $1 AND deleted_at IS NULL AND is_approved = TRUE
           UNION ALL
           SELECT created_at FROM comments WHERE author_id = $1 AND deleted_at IS NULL AND is_approved = TRUE
         ) all_activity
       ),
       streak AS (
         SELECT active_date,
                active_date - (ROW_NUMBER() OVER (ORDER BY active_date))::int AS grp
         FROM daily_activity
       )
       SELECT COALESCE(MAX(cnt), 0) AS streak
       FROM (SELECT COUNT(*) AS cnt FROM streak GROUP BY grp) counts`,
      [userId]
    ),

    // Account age in days
    queryOne<{ age_days: string }>(
      `SELECT EXTRACT(DAY FROM NOW() - created_at)::int AS age_days
       FROM users WHERE id = $1`,
      [userId]
    ),

    // Total governance proposal votes
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM prompt_votes
       WHERE user_id = $1`,
      [userId]
    ),

    // Total proposals created
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM moderation_prompts
       WHERE proposed_by = $1`,
      [userId]
    ),

    // Total proposals passed
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM moderation_prompts
       WHERE proposed_by = $1 AND status = 'active'`,
      [userId]
    ),

    // Referral count (if referrals table exists)
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM referrals
       WHERE referrer_id = $1 AND status = 'completed'`,
      [userId]
    ).catch(() => ({ count: "0" })),

    // Communities created
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM communities
       WHERE created_by = $1 AND deleted_at IS NULL`,
      [userId]
    ),

    // Max community members (of communities created by user)
    queryOne<{ max_members: string }>(
      `SELECT COALESCE(MAX(member_count), 0) AS max_members
       FROM communities
       WHERE created_by = $1 AND deleted_at IS NULL`,
      [userId]
    ),

    // Nighttime activity (00:00-05:00 UTC)
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM (
         SELECT id FROM posts
         WHERE author_id = $1 AND deleted_at IS NULL AND is_approved = TRUE
           AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') < 5
         UNION ALL
         SELECT id FROM comments
         WHERE author_id = $1 AND deleted_at IS NULL AND is_approved = TRUE
           AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') < 5
       ) night_posts`,
      [userId]
    ),

    // Founder badge number
    queryOne<{ founder_number: number | null }>(
      `SELECT founder_number FROM users WHERE id = $1`,
      [userId]
    ),
  ]);

  return {
    total_posts: parseInt(postCounts?.total ?? "0", 10),
    total_approved_posts: parseInt(postCounts?.approved ?? "0", 10),
    total_comments: parseInt(commentCounts?.total ?? "0", 10),
    total_approved_comments: parseInt(commentCounts?.approved ?? "0", 10),
    communities_joined: parseInt(communitiesJoined?.count ?? "0", 10),
    total_sparks_received:
      (sparksReceived?.post_sparks ?? 0) + (sparksReceived?.comment_sparks ?? 0),
    max_post_sparks: parseInt(maxPostSparks?.max_sparks ?? "0", 10),
    consecutive_active_days: parseInt(streakDays?.streak ?? "0", 10),
    account_age_days: parseInt(accountAge?.age_days ?? "0", 10),
    total_proposal_votes: parseInt(proposalVotes?.count ?? "0", 10),
    total_proposals_created: parseInt(proposalsCreated?.count ?? "0", 10),
    total_proposals_passed: parseInt(proposalsPassed?.count ?? "0", 10),
    referral_count: parseInt(referralCount?.count ?? "0", 10),
    communities_created: parseInt(communitiesCreated?.count ?? "0", 10),
    max_community_members_created: parseInt(maxCommunityMembers?.max_members ?? "0", 10),
    nighttime_activity_count: parseInt(nightActivity?.count ?? "0", 10),
    founder_number: founderInfo?.founder_number ?? null,
  };
}

// ─── Check a single threshold badge ──────────────────────────

export async function checkThresholdBadge(
  userId: string,
  metric: keyof UserMetrics,
  threshold: number,
  metrics?: UserMetrics
): Promise<boolean> {
  const m = metrics ?? await getUserMetrics(userId);
  const value = m[metric];
  if (typeof value === "number") {
    return value >= threshold;
  }
  return false;
}

// ─── Check all badges for a user ─────────────────────────────

export async function checkAllBadges(userId: string): Promise<AwardResult[]> {
  const metrics = await getUserMetrics(userId);

  // Get badges user already has
  const owned = await queryAll<{ badge_id: string }>(
    `SELECT badge_id FROM user_badges WHERE user_id = $1`,
    [userId]
  );
  const ownedSet = new Set(owned.map((b) => b.badge_id));

  const eligibleBadges: string[] = [];
  const metadataMap: Record<string, Record<string, unknown>> = {};

  // Check threshold badges
  for (const tb of THRESHOLD_BADGES) {
    if (ownedSet.has(tb.badge_id)) continue;
    const value = metrics[tb.metric];
    if (typeof value === "number" && value >= tb.threshold) {
      eligibleBadges.push(tb.badge_id);
    }
  }

  // Check founder badges (one_time, special logic)
  if (metrics.founder_number !== null) {
    const num = metrics.founder_number;

    // V1 Founder (first 5000)
    if (!ownedSet.has("v1_founder") && num <= 5000) {
      eligibleBadges.push("v1_founder");
      metadataMap["v1_founder"] = { founder_number: num };
    }

    // Alpha Tester (first 100)
    if (!ownedSet.has("v1_alpha_tester") && num <= 100) {
      eligibleBadges.push("v1_alpha_tester");
    }

    // Beta Tester (101-500)
    if (!ownedSet.has("v1_beta_tester") && num >= 101 && num <= 500) {
      eligibleBadges.push("v1_beta_tester");
    }
  }

  // council_member is manual/one_time — checked via separate event
  // supporter, recurring_supporter, bug_hunter, verified_human are manual — not auto-checked

  if (eligibleBadges.length === 0) {
    return [];
  }

  return awardBadges(userId, eligibleBadges, metadataMap);
}

// ─── Event-triggered checks ──────────────────────────────────
// Called after specific actions to check relevant badges only

export async function checkBadgesAfterPost(userId: string): Promise<AwardResult[]> {
  const metrics = await getUserMetrics(userId);
  const owned = await queryAll<{ badge_id: string }>(
    `SELECT badge_id FROM user_badges WHERE user_id = $1`,
    [userId]
  );
  const ownedSet = new Set(owned.map((b) => b.badge_id));

  const eligible: string[] = [];

  const postBadges: ThresholdBadge[] = [
    { badge_id: "first_post", metric: "total_posts", threshold: 1 },
    { badge_id: "prolific_poster", metric: "total_approved_posts", threshold: 50 },
    { badge_id: "posting_machine", metric: "total_approved_posts", threshold: 500 },
    { badge_id: "night_owl", metric: "nighttime_activity_count", threshold: 25 },
  ];

  for (const tb of postBadges) {
    if (ownedSet.has(tb.badge_id)) continue;
    const value = metrics[tb.metric];
    if (typeof value === "number" && value >= tb.threshold) {
      eligible.push(tb.badge_id);
    }
  }

  return eligible.length > 0 ? awardBadges(userId, eligible) : [];
}

export async function checkBadgesAfterComment(userId: string): Promise<AwardResult[]> {
  const metrics = await getUserMetrics(userId);
  const owned = await queryAll<{ badge_id: string }>(
    `SELECT badge_id FROM user_badges WHERE user_id = $1`,
    [userId]
  );
  const ownedSet = new Set(owned.map((b) => b.badge_id));

  const eligible: string[] = [];

  const commentBadges: ThresholdBadge[] = [
    { badge_id: "first_comment", metric: "total_comments", threshold: 1 },
    { badge_id: "conversationalist", metric: "total_approved_comments", threshold: 100 },
    { badge_id: "discussion_veteran", metric: "total_approved_comments", threshold: 1000 },
    { badge_id: "night_owl", metric: "nighttime_activity_count", threshold: 25 },
  ];

  for (const tb of commentBadges) {
    if (ownedSet.has(tb.badge_id)) continue;
    const value = metrics[tb.metric];
    if (typeof value === "number" && value >= tb.threshold) {
      eligible.push(tb.badge_id);
    }
  }

  return eligible.length > 0 ? awardBadges(userId, eligible) : [];
}

export async function checkBadgesAfterSpark(userId: string): Promise<AwardResult[]> {
  const metrics = await getUserMetrics(userId);
  const owned = await queryAll<{ badge_id: string }>(
    `SELECT badge_id FROM user_badges WHERE user_id = $1`,
    [userId]
  );
  const ownedSet = new Set(owned.map((b) => b.badge_id));

  const eligible: string[] = [];

  const sparkBadges: ThresholdBadge[] = [
    { badge_id: "first_spark_received", metric: "total_sparks_received", threshold: 1 },
    { badge_id: "spark_collector", metric: "total_sparks_received", threshold: 100 },
    { badge_id: "spark_magnet", metric: "total_sparks_received", threshold: 1000 },
    { badge_id: "inferno_contributor", metric: "total_sparks_received", threshold: 10000 },
    { badge_id: "legendary_contributor", metric: "total_sparks_received", threshold: 100000 },
    { badge_id: "hot_post", metric: "max_post_sparks", threshold: 100 },
    { badge_id: "viral_post", metric: "max_post_sparks", threshold: 1000 },
  ];

  for (const tb of sparkBadges) {
    if (ownedSet.has(tb.badge_id)) continue;
    const value = metrics[tb.metric];
    if (typeof value === "number" && value >= tb.threshold) {
      eligible.push(tb.badge_id);
    }
  }

  return eligible.length > 0 ? awardBadges(userId, eligible) : [];
}

export async function checkBadgesAfterCommunityJoin(userId: string): Promise<AwardResult[]> {
  const metrics = await getUserMetrics(userId);
  const owned = await queryAll<{ badge_id: string }>(
    `SELECT badge_id FROM user_badges WHERE user_id = $1`,
    [userId]
  );
  const ownedSet = new Set(owned.map((b) => b.badge_id));

  const eligible: string[] = [];

  const joinBadges: ThresholdBadge[] = [
    { badge_id: "community_explorer", metric: "communities_joined", threshold: 10 },
    { badge_id: "community_nomad", metric: "communities_joined", threshold: 50 },
  ];

  for (const tb of joinBadges) {
    if (ownedSet.has(tb.badge_id)) continue;
    const value = metrics[tb.metric];
    if (typeof value === "number" && value >= tb.threshold) {
      eligible.push(tb.badge_id);
    }
  }

  return eligible.length > 0 ? awardBadges(userId, eligible) : [];
}

export async function checkBadgesAfterProposalVote(userId: string): Promise<AwardResult[]> {
  const metrics = await getUserMetrics(userId);
  const owned = await queryAll<{ badge_id: string }>(
    `SELECT badge_id FROM user_badges WHERE user_id = $1`,
    [userId]
  );
  const ownedSet = new Set(owned.map((b) => b.badge_id));

  const eligible: string[] = [];

  const govBadges: ThresholdBadge[] = [
    { badge_id: "first_vote", metric: "total_proposal_votes", threshold: 1 },
    { badge_id: "active_voter", metric: "total_proposal_votes", threshold: 25 },
    { badge_id: "proposal_author", metric: "total_proposals_created", threshold: 1 },
    { badge_id: "successful_proposer", metric: "total_proposals_passed", threshold: 1 },
    { badge_id: "governance_champion", metric: "total_proposals_passed", threshold: 10 },
  ];

  for (const tb of govBadges) {
    if (ownedSet.has(tb.badge_id)) continue;
    const value = metrics[tb.metric];
    if (typeof value === "number" && value >= tb.threshold) {
      eligible.push(tb.badge_id);
    }
  }

  return eligible.length > 0 ? awardBadges(userId, eligible) : [];
}
