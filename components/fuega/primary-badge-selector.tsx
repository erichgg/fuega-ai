"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RARITY_CONFIG, CATEGORY_ICONS, type BadgeRarity } from "@/components/fuega/badge-card";
import { cn } from "@/lib/utils";
import type { Badge, UserBadge } from "@/lib/api/client";

interface PrimaryBadgeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All badge definitions */
  badges: Badge[];
  /** User's earned badges */
  earnedBadges: UserBadge[];
  /** Currently selected primary badge_id */
  currentPrimary: string | null;
  /** Called with the badge_id when user selects */
  onSelect: (badgeId: string) => void;
  /** Whether selection is in progress */
  loading?: boolean;
}

export function PrimaryBadgeSelector({
  open,
  onOpenChange,
  badges,
  earnedBadges,
  currentPrimary,
  onSelect,
  loading = false,
}: PrimaryBadgeSelectorProps) {
  // Build a lookup: badge_id -> full definition
  const defMap = React.useMemo(() => {
    const m = new Map<string, Badge>();
    for (const b of badges) m.set(b.badge_id, b);
    return m;
  }, [badges]);

  // Sort earned badges: legendary first
  const sortedEarned = React.useMemo(() => {
    const rarityOrder: Record<string, number> = {
      legendary: 0,
      epic: 1,
      rare: 2,
      uncommon: 3,
      common: 4,
    };
    return [...earnedBadges].sort(
      (a, b) => (rarityOrder[a.rarity] ?? 5) - (rarityOrder[b.rarity] ?? 5),
    );
  }, [earnedBadges]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-coal border border-lava-hot/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            <span className="text-lava-hot font-bold">$ </span>
            Select Primary Badge
          </DialogTitle>
          <DialogDescription className="text-ash text-xs">
            Your primary badge is displayed next to your username across{" "}
            <span className="text-flame-400 font-semibold">fuega</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-1.5 max-h-[50vh] overflow-y-auto">
          {sortedEarned.length === 0 ? (
            <p className="py-6 text-center text-sm text-smoke">
              <span className="text-lava-hot font-bold">$ </span>
              no badges earned yet
            </p>
          ) : (
            sortedEarned.map((ub) => {
              const def = defMap.get(ub.badge_id);
              const rarity = (ub.rarity || def?.rarity || "common") as BadgeRarity;
              const config = RARITY_CONFIG[rarity];
              const isSelected = currentPrimary === ub.badge_id;
              const category = def?.category ?? ub.category;

              const founderNumber =
                ub.metadata && "founder_number" in ub.metadata
                  ? (ub.metadata.founder_number as number)
                  : null;

              return (
                <button
                  key={ub.badge_id}
                  type="button"
                  disabled={loading}
                  onClick={() => onSelect(ub.badge_id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 border transition-all text-left",
                    isSelected
                      ? "border-lava-hot/40 bg-lava-hot/5"
                      : "border-charcoal hover:border-lava-hot/20 bg-transparent",
                    loading && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-8 h-8 flex items-center justify-center border shrink-0",
                      config.borderClass,
                      config.bgClass,
                    )}
                  >
                    <span className="text-sm">
                      {CATEGORY_ICONS[category] ?? "\u{1F3C6}"}
                    </span>
                  </div>

                  {/* Name + rarity */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold truncate", config.textClass)}>
                      {ub.name}
                      {founderNumber !== null && (
                        <span className="ml-1 opacity-70">
                          #{String(founderNumber).padStart(4, "0")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-smoke">{config.label}</p>
                  </div>

                  {/* Check */}
                  {isSelected && (
                    <Check className="h-4 w-4 text-lava-hot shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
