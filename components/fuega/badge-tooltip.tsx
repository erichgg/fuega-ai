"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RARITY_CONFIG, CATEGORY_ICONS, type BadgeRarity } from "@/components/fuega/badge-card";
import { cn } from "@/lib/utils";
import type { Badge, UserBadge } from "@/lib/api/client";

interface BadgeTooltipProps {
  badge: Badge;
  earned?: UserBadge | null;
  /** Approximate percentage of users who have this badge */
  percentOwned?: number | null;
  children: React.ReactNode;
}

export function BadgeTooltip({
  badge,
  earned = null,
  percentOwned = null,
  children,
}: BadgeTooltipProps) {
  const rarity = badge.rarity as BadgeRarity;
  const config = RARITY_CONFIG[rarity];
  const isEarned = earned !== null;

  const founderNumber =
    isEarned && earned?.metadata && "founder_number" in earned.metadata
      ? (earned.metadata.founder_number as number)
      : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-coal border border-lava-hot/20 text-foreground p-3 max-w-[240px]"
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {CATEGORY_ICONS[badge.category] ?? "\u{1F3C6}"}
            </span>
            <div>
              <p className={cn("text-xs font-bold", config.textClass)}>
                {badge.name}
                {founderNumber !== null &&
                  ` #${String(founderNumber).padStart(4, "0")}`}
              </p>
              <p className={cn("text-[10px]", config.textClass, "opacity-70")}>
                {config.label}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-[10px] text-ash mt-2 leading-relaxed">
            {badge.description}
          </p>

          {/* Footer info */}
          <div className="mt-2 pt-2 border-t border-lava-hot/10 flex items-center justify-between text-[10px]">
            {isEarned && earned ? (
              <span className="text-smoke">
                Earned{" "}
                {new Date(earned.earned_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            ) : (
              <span className="text-smoke/60">Not yet earned</span>
            )}

            {percentOwned !== null && (
              <span className="text-smoke">
                {percentOwned < 1
                  ? "<1"
                  : percentOwned.toFixed(0)}
                % of users
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
