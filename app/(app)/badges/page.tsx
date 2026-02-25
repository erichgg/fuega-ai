"use client";

import * as React from "react";
import { Award, XCircle } from "lucide-react";
import { BadgeGallery } from "@/components/fuega/badge-gallery";
import { BadgeProgress } from "@/components/fuega/badge-progress";
import { useAuth } from "@/lib/contexts/auth-context";
import { api, ApiError } from "@/lib/api/client";
import type { Badge, UserBadge } from "@/lib/api/client";

export default function BadgesPage() {
  const { user } = useAuth();
  const [badges, setBadges] = React.useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = React.useState<UserBadge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [progressMap] = React.useState<
    Record<string, { current: number; target: number }>
  >({});

  React.useEffect(() => {
    let cancelled = false;

    async function fetchBadges() {
      setLoading(true);
      setError(null);
      try {
        const [allBadgesRes, userBadgesRes] = await Promise.all([
          api.get<{ badges: Badge[] }>("/api/badges"),
          user
            ? api.get<{ badges: UserBadge[] }>(`/api/users/${user.id}/badges`)
            : Promise.resolve({ badges: [] as UserBadge[] }),
        ]);
        if (!cancelled) {
          setBadges(allBadgesRes.badges);
          setEarnedBadges(userBadgesRes.badges);
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
  }, [user]);

  // Next threshold badges for progress display
  const nextBadges = React.useMemo(() => {
    const earnedIds = new Set(earnedBadges.map((b) => b.badge_id));
    return badges.filter(
      (b) => !earnedIds.has(b.badge_id) && progressMap[b.badge_id],
    );
  }, [badges, earnedBadges, progressMap]);

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
    <div className="py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground glow-text-subtle">
          <span className="text-lava-hot font-bold">$ </span>
          badges
        </h1>
        <p className="text-xs text-ash mt-1">
          Earn badges for milestones, contributions, and campfire engagement on{" "}
          <span className="text-flame-400 font-semibold">fuega</span>.
        </p>
      </div>

      {/* Progress toward next badges (if logged in) */}
      {user && nextBadges.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-lava-hot" />
            In Progress
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nextBadges.slice(0, 4).map((badge) => (
              <BadgeProgress
                key={badge.badge_id}
                badge={badge}
                current={progressMap[badge.badge_id]?.current ?? 0}
                target={progressMap[badge.badge_id]?.target ?? 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full gallery */}
      <BadgeGallery
        badges={badges}
        earnedBadges={earnedBadges}
        progressMap={progressMap}
      />
    </div>
  );
}
