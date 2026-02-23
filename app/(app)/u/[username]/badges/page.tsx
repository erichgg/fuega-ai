"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Award, Settings } from "lucide-react";
import { BadgeGallery } from "@/components/fuega/badge-gallery";
import { PrimaryBadgeSelector } from "@/components/fuega/primary-badge-selector";
import { InlineBadge, RARITY_CONFIG } from "@/components/fuega/badge-card";
import { useAuth } from "@/lib/contexts/auth-context";
import type { Badge, UserBadge } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// TEST_DATA - DELETE BEFORE PRODUCTION
// ---------------------------------------------------------------------------

const MOCK_BADGES: Badge[] = [
  { badge_id: "v1_founder", name: "V1 Founder", description: "One of the first 5,000 users to join fuega.ai.", category: "founder", rarity: "legendary", version: "v1" },
  { badge_id: "v1_alpha_tester", name: "Alpha Tester", description: "Participated in the fuega.ai alpha testing phase (first 100 users).", category: "founder", rarity: "legendary", version: "v1" },
  { badge_id: "v1_beta_tester", name: "Beta Tester", description: "Participated in the fuega.ai closed beta (users #101 through #500).", category: "founder", rarity: "epic", version: "v1" },
  { badge_id: "first_post", name: "First Flame", description: "Published your first post on fuega.ai.", category: "engagement", rarity: "common", version: "v1" },
  { badge_id: "prolific_poster", name: "Prolific Poster", description: "Published 50 approved posts across any campfires.", category: "engagement", rarity: "uncommon", version: "v1" },
  { badge_id: "posting_machine", name: "Posting Machine", description: "Published 500 approved posts across any campfires.", category: "engagement", rarity: "rare", version: "v1" },
  { badge_id: "first_comment", name: "Sparked a Conversation", description: "Left your first comment on fuega.ai.", category: "engagement", rarity: "common", version: "v1" },
  { badge_id: "conversationalist", name: "Conversationalist", description: "Left 100 approved comments across any posts.", category: "engagement", rarity: "uncommon", version: "v1" },
  { badge_id: "discussion_veteran", name: "Discussion Veteran", description: "Left 1,000 approved comments across any posts.", category: "engagement", rarity: "rare", version: "v1" },
  { badge_id: "campfire_explorer", name: "Campfire Explorer", description: "Joined 10 different campfires.", category: "engagement", rarity: "common", version: "v1" },
  { badge_id: "campfire_nomad", name: "Campfire Nomad", description: "Joined 50 different campfires.", category: "engagement", rarity: "uncommon", version: "v1" },
  { badge_id: "night_owl", name: "Night Owl", description: "Made 25 posts or comments between midnight and 5 AM (server time UTC).", category: "engagement", rarity: "uncommon", version: "v1" },
  { badge_id: "streak_7", name: "Weekly Streak", description: "Posted or commented every day for 7 consecutive days.", category: "engagement", rarity: "common", version: "v1" },
  { badge_id: "streak_30", name: "Monthly Streak", description: "Posted or commented every day for 30 consecutive days.", category: "engagement", rarity: "rare", version: "v1" },
  { badge_id: "streak_365", name: "Annual Inferno", description: "Posted or commented every day for 365 consecutive days.", category: "engagement", rarity: "legendary", version: "v1" },
  { badge_id: "one_year_member", name: "One Year Strong", description: "Account has been active for one full year.", category: "engagement", rarity: "uncommon", version: "v1" },
  { badge_id: "first_spark_received", name: "First Spark", description: "Received your first spark on a post or comment.", category: "contribution", rarity: "common", version: "v1" },
  { badge_id: "spark_collector", name: "Spark Collector", description: "Received 100 total sparks across all your content.", category: "contribution", rarity: "uncommon", version: "v1" },
  { badge_id: "spark_magnet", name: "Spark Magnet", description: "Received 1,000 total sparks across all your content.", category: "contribution", rarity: "rare", version: "v1" },
  { badge_id: "inferno_contributor", name: "Inferno Contributor", description: "Received 10,000 total sparks across all your content.", category: "contribution", rarity: "epic", version: "v1" },
  { badge_id: "legendary_contributor", name: "Legendary Contributor", description: "Received 100,000 total sparks across all your content.", category: "contribution", rarity: "legendary", version: "v1" },
  { badge_id: "hot_post", name: "Hot Post", description: "Had a single post reach 100 sparks.", category: "contribution", rarity: "rare", version: "v1" },
  { badge_id: "viral_post", name: "Viral Post", description: "Had a single post reach 1,000 sparks.", category: "contribution", rarity: "epic", version: "v1" },
  { badge_id: "campfire_builder", name: "Campfire Builder", description: "Created a campfire that reached 100 members.", category: "contribution", rarity: "rare", version: "v1" },
  { badge_id: "campfire_architect", name: "Campfire Architect", description: "Created a campfire that reached 1,000 members.", category: "contribution", rarity: "epic", version: "v1" },
  { badge_id: "first_vote", name: "Civic Duty", description: "Cast your first vote on a governance proposal.", category: "governance", rarity: "common", version: "v1" },
  { badge_id: "active_voter", name: "Active Voter", description: "Cast votes on 25 governance proposals.", category: "governance", rarity: "uncommon", version: "v1" },
  { badge_id: "proposal_author", name: "Proposal Author", description: "Created your first governance proposal.", category: "governance", rarity: "uncommon", version: "v1" },
  { badge_id: "successful_proposer", name: "Successful Proposer", description: "Authored a governance proposal that passed campfire vote.", category: "governance", rarity: "rare", version: "v1" },
  { badge_id: "governance_champion", name: "Governance Champion", description: "Authored 10 governance proposals that passed campfire vote.", category: "governance", rarity: "epic", version: "v1" },
  { badge_id: "council_member", name: "Council Member", description: "Elected to serve on a category council.", category: "governance", rarity: "rare", version: "v1" },
  { badge_id: "first_referral", name: "Spark Spreader", description: "Referred your first user to fuega.ai.", category: "referral", rarity: "common", version: "v1" },
  { badge_id: "v1_ambassador", name: "V1 Ambassador", description: "Referred 5 or more users.", category: "referral", rarity: "uncommon", version: "v1" },
  { badge_id: "v1_influencer", name: "V1 Influencer", description: "Referred 25 or more users.", category: "referral", rarity: "rare", version: "v1" },
  { badge_id: "v1_legend", name: "V1 Legend", description: "Referred 100 or more users.", category: "referral", rarity: "legendary", version: "v1" },
  { badge_id: "supporter", name: "Supporter", description: "Made a donation to the fuega.ai tip jar.", category: "special", rarity: "rare", version: "v1" },
  { badge_id: "recurring_supporter", name: "Recurring Supporter", description: "Set up a recurring monthly donation.", category: "special", rarity: "epic", version: "v1" },
  { badge_id: "bug_hunter", name: "Bug Hunter", description: "Reported a verified bug or security vulnerability.", category: "special", rarity: "rare", version: "v1" },
  { badge_id: "campfire_creator", name: "Campfire Creator", description: "Created your first campfire.", category: "special", rarity: "uncommon", version: "v1" },
  { badge_id: "verified_human", name: "Verified Human", description: "Passed an additional verification step.", category: "special", rarity: "uncommon", version: "v1" },
];

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockUserBadges(): UserBadge[] {
  return [
    { badge_id: "v1_founder", name: "V1 Founder", description: "One of the first 5,000 users.", category: "founder", rarity: "legendary", earned_at: "2026-01-15T00:00:00Z", metadata: { founder_number: 42 } },
    { badge_id: "first_post", name: "First Flame", description: "Published your first post.", category: "engagement", rarity: "common", earned_at: "2026-01-16T00:00:00Z", metadata: null },
    { badge_id: "first_comment", name: "Sparked a Conversation", description: "Left your first comment.", category: "engagement", rarity: "common", earned_at: "2026-01-16T12:00:00Z", metadata: null },
    { badge_id: "first_spark_received", name: "First Spark", description: "Received your first spark.", category: "contribution", rarity: "common", earned_at: "2026-01-17T00:00:00Z", metadata: null },
    { badge_id: "streak_7", name: "Weekly Streak", description: "7 consecutive active days.", category: "engagement", rarity: "common", earned_at: "2026-01-22T00:00:00Z", metadata: null },
    { badge_id: "campfire_explorer", name: "Campfire Explorer", description: "Joined 10 campfires.", category: "engagement", rarity: "common", earned_at: "2026-01-25T00:00:00Z", metadata: null },
    { badge_id: "first_vote", name: "Civic Duty", description: "Cast your first governance vote.", category: "governance", rarity: "common", earned_at: "2026-02-01T00:00:00Z", metadata: null },
    { badge_id: "spark_collector", name: "Spark Collector", description: "100 total sparks received.", category: "contribution", rarity: "uncommon", earned_at: "2026-02-10T00:00:00Z", metadata: null },
    { badge_id: "prolific_poster", name: "Prolific Poster", description: "50 approved posts.", category: "engagement", rarity: "uncommon", earned_at: "2026-02-15T00:00:00Z", metadata: null },
  ];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserBadgesPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const username = params.username as string;
  const isOwnProfile = currentUser?.username === username;

  const [earnedBadges] = React.useState<UserBadge[]>(getMockUserBadges());
  const [primaryBadgeId, setPrimaryBadgeId] = React.useState<string | null>("v1_founder");
  const [selectorOpen, setSelectorOpen] = React.useState(false);

  const primaryBadge = React.useMemo(() => {
    if (!primaryBadgeId) return null;
    return MOCK_BADGES.find((b) => b.badge_id === primaryBadgeId) ?? null;
  }, [primaryBadgeId]);

  const handleSelectPrimary = (badgeId: string) => {
    setPrimaryBadgeId(badgeId);
    setSelectorOpen(false);
  };

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/u/${username}`}
            className="text-xs text-smoke hover:text-ash transition-colors flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to profile
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground glow-text-subtle">
            <span className="text-lava-hot font-bold">$ </span>
            {username}&apos;s badges
          </h1>
          <p className="text-xs text-ash mt-1">
            <span className="text-lava-hot font-semibold">{earnedBadges.length}</span>{" "}
            badges earned out of {MOCK_BADGES.length}
          </p>
        </div>

        {/* Primary badge display + edit */}
        {primaryBadge && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-smoke uppercase tracking-wider">
              Primary Badge
            </span>
            <div className="flex items-center gap-2">
              <InlineBadge
                badge={primaryBadge}
                founderNumber={
                  primaryBadge.badge_id === "v1_founder" ? 42 : null
                }
              />
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setSelectorOpen(true)}
                  className="text-smoke hover:text-lava-hot transition-colors"
                  aria-label="Change primary badge"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Badge summary by rarity */}
      <div className="flex flex-wrap gap-3">
        {(["legendary", "epic", "rare", "uncommon", "common"] as const).map((rarity) => {
          const count = earnedBadges.filter((b) => b.rarity === rarity).length;
          if (count === 0) return null;
          const { textClass } = RARITY_CONFIG[rarity];
          return (
            <div key={rarity} className="terminal-card px-3 py-2 flex items-center gap-2">
              <span className={`text-xs font-semibold capitalize ${textClass}`}>
                {rarity}
              </span>
              <span className="text-xs text-smoke">&times;{count}</span>
            </div>
          );
        })}
      </div>

      {/* Gallery — showing only earned badges on user profile */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-lava-hot" />
          All Badges
        </h2>
        <BadgeGallery
          badges={MOCK_BADGES}
          earnedBadges={earnedBadges}
        />
      </div>

      {/* Primary badge selector modal */}
      {isOwnProfile && (
        <PrimaryBadgeSelector
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          badges={MOCK_BADGES}
          earnedBadges={earnedBadges}
          currentPrimary={primaryBadgeId}
          onSelect={handleSelectPrimary}
        />
      )}
    </div>
  );
}
