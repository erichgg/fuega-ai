"use client";

import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Badge, UserBadge } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Rarity config
// ---------------------------------------------------------------------------

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_CONFIG: Record<
  BadgeRarity,
  {
    /** Tailwind-palette hex used only where a raw color is unavoidable (box-shadow, CSS gradients). */
    hex: string;
    borderClass: string;
    bgClass: string;
    /** Tailwind class for progress bar fill — mirrors bgClass without opacity modifier. */
    progressClass: string;
    textClass: string;
    glowClass: string;
    label: string;
  }
> = {
  common: {
    // ash-400 → #8B8B8B (theme-aware via CSS vars)
    hex: "#8B8B8B",
    borderClass: "border-ash-400/30",
    bgClass: "bg-ash-400/10",
    progressClass: "bg-ash-400",
    textClass: "text-ash-400",
    glowClass: "",
    label: "Common",
  },
  uncommon: {
    // green-400 → #4ade80
    hex: "#4ade80",
    borderClass: "border-green-400/30",
    bgClass: "bg-green-400/10",
    progressClass: "bg-green-400",
    textClass: "text-green-400",
    glowClass: "animate-pulse",
    label: "Uncommon",
  },
  rare: {
    // blue-400 → #60a5fa
    hex: "#60a5fa",
    borderClass: "border-blue-400/30",
    bgClass: "bg-blue-400/10",
    progressClass: "bg-blue-400",
    textClass: "text-blue-400",
    glowClass: "badge-shimmer",
    label: "Rare",
  },
  epic: {
    // purple-400 → #c084fc
    hex: "#c084fc",
    borderClass: "border-purple-400/30",
    bgClass: "bg-purple-400/10",
    progressClass: "bg-purple-400",
    textClass: "text-purple-400",
    glowClass: "badge-radiance",
    label: "Epic",
  },
  legendary: {
    // orange-400 → #fb923c (closest Tailwind orange to flame)
    hex: "#fb923c",
    borderClass: "border-orange-400/30",
    bgClass: "bg-orange-400/10",
    progressClass: "bg-orange-400",
    textClass: "text-orange-400",
    glowClass: "badge-fire-glow",
    label: "Legendary",
  },
};

// ---------------------------------------------------------------------------
// Badge category icons (emoji-based for V1, swap for custom SVGs later)
// ---------------------------------------------------------------------------

export const CATEGORY_ICONS: Record<string, string> = {
  founder: "\u{1F525}",      // fire
  engagement: "\u{1F4AC}",   // speech balloon
  contribution: "\u{2B50}",  // star
  governance: "\u{1F5F3}",   // ballot box
  referral: "\u{1F517}",     // link
  special: "\u{1F48E}",      // gem stone
};

// ---------------------------------------------------------------------------
// Badge icon area
// ---------------------------------------------------------------------------

function BadgeIcon({
  badge,
  rarity,
  earned,
  size = "md",
}: {
  badge: Badge | UserBadge;
  rarity: BadgeRarity;
  earned: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const config = RARITY_CONFIG[rarity];
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center border",
        sizeClasses[size],
        earned ? config.borderClass : "border-charcoal",
        earned ? config.bgClass : "bg-charcoal/50",
        earned && config.glowClass,
        !earned && "opacity-40 grayscale",
      )}
      style={
        earned && rarity === "legendary"
          ? {
              boxShadow: `0 0 12px ${config.hex}40, 0 0 24px ${config.hex}20`,
            }
          : earned && rarity === "epic"
            ? {
                boxShadow: `0 0 8px ${config.hex}30`,
              }
            : earned && rarity === "rare"
              ? {
                  boxShadow: `0 0 6px ${config.hex}25`,
                }
              : undefined
      }
    >
      <span className={cn("select-none", !earned && "opacity-50")}>
        {CATEGORY_ICONS[badge.category] ?? "\u{1F3C6}"}
      </span>
      {!earned && (
        <Lock className="absolute bottom-0.5 right-0.5 h-3 w-3 text-smoke" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BadgeCard component
// ---------------------------------------------------------------------------

interface BadgeCardProps {
  badge: Badge;
  earned?: UserBadge | null;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  progress?: { current: number; target: number } | null;
  className?: string;
}

export function BadgeCard({
  badge,
  earned = null,
  onClick,
  size = "md",
  showProgress = false,
  progress = null,
  className,
}: BadgeCardProps) {
  const rarity = badge.rarity as BadgeRarity;
  const config = RARITY_CONFIG[rarity];
  const isEarned = earned !== null;

  const founderNumber =
    isEarned && earned.metadata && "founder_number" in earned.metadata
      ? (earned.metadata.founder_number as number)
      : null;

  const card = (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "terminal-card flex flex-col items-center gap-2 p-3 transition-all text-left w-full",
        onClick && "cursor-pointer hover:border-lava-hot/40",
        !onClick && "cursor-default",
        className,
      )}
    >
      <BadgeIcon badge={badge} rarity={rarity} earned={isEarned} size={size} />

      <div className="text-center w-full min-w-0">
        <p
          className={cn(
            "text-xs font-semibold truncate",
            isEarned ? config.textClass : "text-smoke",
          )}
        >
          {badge.name}
          {founderNumber !== null && (
            <span className="ml-1 opacity-70">
              #{String(founderNumber).padStart(4, "0")}
            </span>
          )}
        </p>

        <p className={cn("text-[10px] mt-0.5", isEarned ? "text-ash" : "text-smoke/60")}>
          {config.label}
        </p>
      </div>

      {showProgress && progress && !isEarned && (
        <div className="w-full mt-1">
          <div className="h-1 w-full bg-charcoal overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500", config.progressClass)}
              style={{
                width: `${Math.min(100, (progress.current / progress.target) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[9px] text-smoke mt-0.5 text-center">
            {progress.current}/{progress.target}
          </p>
        </div>
      )}
    </button>
  );

  // Wrap with tooltip if earned
  if (isEarned && earned) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-coal border border-lava-hot/20 text-foreground p-3 max-w-[220px]"
          >
            <p className={cn("text-xs font-bold", config.textClass)}>
              {badge.name}
              {founderNumber !== null && ` #${String(founderNumber).padStart(4, "0")}`}
            </p>
            <p className="text-[10px] text-ash mt-1">{badge.description}</p>
            <div className="flex items-center justify-between mt-2 text-[10px]">
              <span className={config.textClass}>{config.label}</span>
              <span className="text-smoke">
                {new Date(earned.earned_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}

// ---------------------------------------------------------------------------
// Inline badge (small, for display next to username)
// ---------------------------------------------------------------------------

interface InlineBadgeProps {
  badge: Badge | UserBadge;
  founderNumber?: number | null;
  className?: string;
}

export function InlineBadge({ badge, founderNumber, className }: InlineBadgeProps) {
  const rarity = badge.rarity as BadgeRarity;
  const config = RARITY_CONFIG[rarity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium border",
        config.bgClass,
        config.textClass,
        config.borderClass,
        className,
      )}
    >
      <span className="text-[10px]">{CATEGORY_ICONS[badge.category] ?? "\u{1F3C6}"}</span>
      {badge.name}
      {founderNumber != null && (
        <span className="opacity-70">#{String(founderNumber).padStart(4, "0")}</span>
      )}
    </span>
  );
}
