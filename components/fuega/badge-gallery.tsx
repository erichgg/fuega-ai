"use client";

import * as React from "react";
import { BadgeCard, RARITY_CONFIG, type BadgeRarity } from "@/components/fuega/badge-card";
import { cn } from "@/lib/utils";
import type { Badge, UserBadge } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "founder", label: "Founder" },
  { key: "engagement", label: "Engagement" },
  { key: "contribution", label: "Contribution" },
  { key: "governance", label: "Governance" },
  { key: "referral", label: "Referral" },
  { key: "special", label: "Special" },
] as const;

type SortMode = "rarity" | "category" | "name";

const RARITY_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BadgeGalleryProps {
  /** All badge definitions */
  badges: Badge[];
  /** Badges the current viewer has earned (empty for non-owned profiles) */
  earnedBadges?: UserBadge[];
  /** If provided, shows progress for threshold badges */
  progressMap?: Record<string, { current: number; target: number }>;
  /** Called when a badge card is clicked */
  onBadgeClick?: (badge: Badge) => void;
  className?: string;
}

export function BadgeGallery({
  badges,
  earnedBadges = [],
  progressMap = {},
  onBadgeClick,
  className,
}: BadgeGalleryProps) {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [sortMode, setSortMode] = React.useState<SortMode>("rarity");

  // Map earned badges by badge_id for quick lookup
  const earnedMap = React.useMemo(() => {
    const map = new Map<string, UserBadge>();
    for (const ub of earnedBadges) {
      map.set(ub.badge_id, ub);
    }
    return map;
  }, [earnedBadges]);

  // Filter + sort
  const filtered = React.useMemo(() => {
    let list =
      activeCategory === "all"
        ? badges
        : badges.filter((b) => b.category === activeCategory);

    if (sortMode === "rarity") {
      list = [...list].sort(
        (a, b) => (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5),
      );
    } else if (sortMode === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    // "category" keeps the original order

    return list;
  }, [badges, activeCategory, sortMode]);

  // Count earned
  const earnedCount = earnedBadges.length;
  const totalCount = badges.length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ash">
          <span className="text-lava-hot font-semibold">{earnedCount}</span>
          <span className="text-smoke"> / {totalCount} earned</span>
        </p>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-smoke">Sort:</span>
          {(["rarity", "category", "name"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={cn(
                "px-2 py-0.5 border transition-colors capitalize",
                sortMode === mode
                  ? "border-lava-hot/40 text-lava-hot bg-lava-hot/10"
                  : "border-charcoal text-smoke hover:text-ash",
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const count =
            cat.key === "all"
              ? badges.length
              : badges.filter((b) => b.category === cat.key).length;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "px-3 py-1 text-xs border transition-colors",
                activeCategory === cat.key
                  ? "border-lava-hot text-lava-hot bg-lava-hot/10"
                  : "border-charcoal text-smoke hover:text-ash hover:border-ash/30",
              )}
            >
              {cat.label}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((badge) => {
          const earned = earnedMap.get(badge.badge_id) ?? null;
          const progress = progressMap[badge.badge_id] ?? null;

          return (
            <BadgeCard
              key={badge.badge_id}
              badge={badge}
              earned={earned}
              onClick={onBadgeClick ? () => onBadgeClick(badge) : undefined}
              showProgress={!earned && progress !== null}
              progress={progress}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-smoke">
            <span className="text-lava-hot font-bold">$ </span>
            no badges found in this category
          </p>
        </div>
      )}
    </div>
  );
}
