"use client";

import * as React from "react";
import { RARITY_CONFIG, type BadgeRarity } from "@/components/fuega/badge-card";
import { cn } from "@/lib/utils";

// Referral badge milestones matching GAMIFICATION.md
const REFERRAL_MILESTONES = [
  { threshold: 1, name: "Spark Spreader", rarity: "common" as BadgeRarity, badge_id: "first_referral" },
  { threshold: 5, name: "V1 Ambassador", rarity: "uncommon" as BadgeRarity, badge_id: "v1_ambassador" },
  { threshold: 25, name: "V1 Influencer", rarity: "rare" as BadgeRarity, badge_id: "v1_influencer" },
  { threshold: 100, name: "V1 Legend", rarity: "legendary" as BadgeRarity, badge_id: "v1_legend" },
];

interface ReferralProgressProps {
  currentCount: number;
  className?: string;
}

export function ReferralProgress({ currentCount, className }: ReferralProgressProps) {
  // Find the next milestone the user hasn't reached yet
  const nextMilestone = REFERRAL_MILESTONES.find((m) => currentCount < m.threshold);
  const lastReached = [...REFERRAL_MILESTONES]
    .reverse()
    .find((m) => currentCount >= m.threshold);

  // Overall progress percentage relative to next milestone
  const prevThreshold = lastReached ? lastReached.threshold : 0;
  const lastMilestone = REFERRAL_MILESTONES[REFERRAL_MILESTONES.length - 1];
  const nextThreshold = nextMilestone ? nextMilestone.threshold : (lastMilestone?.threshold ?? 100);
  const segmentProgress = nextMilestone
    ? ((currentCount - prevThreshold) / (nextThreshold - prevThreshold)) * 100
    : 100;

  return (
    <div className={cn("terminal-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-ash uppercase tracking-wider font-semibold">
          Badge Progress
        </p>
        {nextMilestone && (
          <p className="text-xs text-smoke">
            {nextMilestone.threshold - currentCount} more to{" "}
            <span className={RARITY_CONFIG[nextMilestone.rarity].textClass}>
              {nextMilestone.name}
            </span>
          </p>
        )}
      </div>

      {/* Milestone markers */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 w-full bg-charcoal overflow-hidden">
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, segmentProgress)}%`,
              backgroundColor: nextMilestone
                ? `${RARITY_CONFIG[nextMilestone.rarity].hex}99`
                : RARITY_CONFIG.legendary.hex,
            }}
          />
        </div>

        {/* Milestone dots */}
        <div className="flex justify-between mt-3">
          {REFERRAL_MILESTONES.map((milestone) => {
            const earned = currentCount >= milestone.threshold;
            const config = RARITY_CONFIG[milestone.rarity];

            return (
              <div key={milestone.badge_id} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-6 h-6 flex items-center justify-center border text-[10px] font-bold",
                    earned ? config.borderClass : "border-charcoal",
                    earned ? config.bgClass : "bg-charcoal/50",
                  )}
                  style={
                    earned
                      ? { boxShadow: `0 0 8px ${config.hex}30` }
                      : undefined
                  }
                >
                  {earned ? "\u2713" : milestone.threshold}
                </div>
                <p
                  className={cn(
                    "text-[9px] text-center max-w-[60px] leading-tight",
                    earned ? config.textClass : "text-smoke",
                  )}
                >
                  {milestone.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {!nextMilestone && (
        <p className="text-xs text-center mt-3">
          <span className={RARITY_CONFIG.legendary.textClass}>
            All referral badges earned!
          </span>
        </p>
      )}
    </div>
  );
}
