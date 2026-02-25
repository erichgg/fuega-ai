"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Award, Settings, XCircle } from "lucide-react";
import { BadgeGallery } from "@/components/fuega/badge-gallery";
import { PrimaryBadgeSelector } from "@/components/fuega/primary-badge-selector";
import { InlineBadge, RARITY_CONFIG } from "@/components/fuega/badge-card";
import { useAuth } from "@/lib/contexts/auth-context";
import { api, ApiError } from "@/lib/api/client";
import type { Badge, UserBadge } from "@/lib/api/client";

export default function UserBadgesPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const username = params.username as string;
  const isOwnProfile = currentUser?.username === username;

  const [allBadges, setAllBadges] = React.useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = React.useState<UserBadge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [primaryBadgeId, setPrimaryBadgeId] = React.useState<string | null>(
    null,
  );
  const [selectorOpen, setSelectorOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchBadges() {
      setLoading(true);
      setError(null);
      try {
        // We need the user's ID to call the badges API.
        // First get the profile to resolve username -> id.
        interface UserProfile {
          id: string;
          username: string;
          primary_badge_id: string | null;
        }

        // The user profile API might be at /api/users/:username/profile or similar.
        // We'll try fetching by username; the API route uses [id] which may accept username too.
        const [allBadgesRes, profileRes] = await Promise.all([
          api.get<{ badges: Badge[] }>("/api/badges"),
          api.get<{ user: UserProfile }>(`/api/users/${username}/profile`),
        ]);

        const userId = profileRes.user.id;
        const userBadgesRes = await api.get<{ badges: UserBadge[] }>(
          `/api/users/${userId}/badges`,
        );

        if (!cancelled) {
          setAllBadges(allBadgesRes.badges);
          setEarnedBadges(userBadgesRes.badges);
          setPrimaryBadgeId(profileRes.user.primary_badge_id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load badges",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBadges();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const primaryBadge = React.useMemo(() => {
    if (!primaryBadgeId) return null;
    return allBadges.find((b) => b.badge_id === primaryBadgeId) ?? null;
  }, [primaryBadgeId, allBadges]);

  const handleSelectPrimary = (badgeId: string) => {
    setPrimaryBadgeId(badgeId);
    setSelectorOpen(false);
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-ash">Loading badges...</div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400/60" />
        <p className="mt-4 text-ash">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl py-4 sm:py-6 space-y-6">
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
            <span className="text-lava-hot font-semibold">
              {earnedBadges.length}
            </span>{" "}
            badges earned out of {allBadges.length}
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
                  primaryBadge.badge_id === "v1_founder"
                    ? (
                        earnedBadges.find((b) => b.badge_id === "v1_founder")
                          ?.metadata as Record<string, unknown> | null
                      )?.founder_number as number | null ?? null
                    : null
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
        {(["legendary", "epic", "rare", "uncommon", "common"] as const).map(
          (rarity) => {
            const count = earnedBadges.filter(
              (b) => b.rarity === rarity,
            ).length;
            if (count === 0) return null;
            const { textClass } = RARITY_CONFIG[rarity];
            return (
              <div
                key={rarity}
                className="terminal-card px-3 py-2 flex items-center gap-2"
              >
                <span
                  className={`text-xs font-semibold capitalize ${textClass}`}
                >
                  {rarity}
                </span>
                <span className="text-xs text-smoke">&times;{count}</span>
              </div>
            );
          },
        )}
      </div>

      {/* Gallery -- showing only earned badges on user profile */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-lava-hot" />
          All Badges
        </h2>
        <BadgeGallery badges={allBadges} earnedBadges={earnedBadges} />
      </div>

      {/* Primary badge selector modal */}
      {isOwnProfile && (
        <PrimaryBadgeSelector
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          badges={allBadges}
          earnedBadges={earnedBadges}
          currentPrimary={primaryBadgeId}
          onSelect={handleSelectPrimary}
        />
      )}
    </div>
  );
}
