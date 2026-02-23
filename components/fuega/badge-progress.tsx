import { RARITY_CONFIG, CATEGORY_ICONS, type BadgeRarity } from "@/components/fuega/badge-card";
import { cn } from "@/lib/utils";
import type { Badge } from "@/lib/api/client";

interface BadgeProgressProps {
  badge: Badge;
  current: number;
  target: number;
  className?: string;
}

export function BadgeProgress({
  badge,
  current,
  target,
  className,
}: BadgeProgressProps) {
  const rarity = badge.rarity as BadgeRarity;
  const config = RARITY_CONFIG[rarity];
  const pct = Math.min(100, (current / target) * 100);
  const isComplete = current >= target;

  return (
    <div
      className={cn(
        "terminal-card p-3 flex items-center gap-3",
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 flex items-center justify-center border shrink-0",
          isComplete ? config.borderClass : "border-charcoal",
          isComplete ? config.bgClass : "bg-charcoal/50",
        )}
      >
        <span className="text-sm">
          {CATEGORY_ICONS[badge.category] ?? "\u{1F3C6}"}
        </span>
      </div>

      {/* Text + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-xs font-semibold truncate",
              isComplete ? config.textClass : "text-ash",
            )}
          >
            {badge.name}
          </p>
          <span className="text-[10px] text-smoke shrink-0">
            {current.toLocaleString()}/{target.toLocaleString()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-charcoal mt-1.5 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out",
              config.progressClass,
              !isComplete && "opacity-60",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-[9px] text-smoke mt-1">
          {isComplete ? (
            <span className={config.textClass}>Complete!</span>
          ) : (
            `${Math.round(pct)}% — ${(target - current).toLocaleString()} more to go`
          )}
        </p>
      </div>
    </div>
  );
}
