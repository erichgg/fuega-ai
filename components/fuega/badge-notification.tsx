"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { RARITY_CONFIG, CATEGORY_ICONS, type BadgeRarity } from "@/components/fuega/badge-card";
import { cn } from "@/lib/utils";

interface BadgeNotificationProps {
  badgeId: string;
  badgeName: string;
  badgeRarity: string;
  badgeCategory: string;
  badgeDescription: string;
  founderNumber?: number | null;
  onDismiss: () => void;
}

export function BadgeNotification({
  badgeId,
  badgeName,
  badgeRarity,
  badgeCategory,
  badgeDescription,
  founderNumber,
  onDismiss,
}: BadgeNotificationProps) {
  const rarity = badgeRarity as BadgeRarity;
  const config = RARITY_CONFIG[rarity];
  const [visible, setVisible] = React.useState(false);

  // Animate in
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss after 8 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <div
        className="bg-coal border p-4 relative overflow-hidden"
        style={{
          borderColor: `${config.hex}40`,
          boxShadow:
            rarity === "legendary"
              ? `0 0 30px ${config.hex}30, 0 0 60px ${config.hex}15`
              : rarity === "epic"
                ? `0 0 20px ${config.hex}25`
                : `0 0 15px ${config.hex}15`,
        }}
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-smoke hover:text-ash transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Badge earned label */}
        <p className="text-[10px] uppercase tracking-wider text-smoke mb-2">
          Badge Earned
        </p>

        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={cn(
              "w-12 h-12 flex items-center justify-center border shrink-0",
              config.borderClass,
              config.bgClass,
              rarity === "legendary" && "badge-fire-glow",
              rarity === "epic" && "badge-radiance",
            )}
            style={
              rarity === "legendary"
                ? { boxShadow: `0 0 12px ${config.hex}40` }
                : undefined
            }
          >
            <span className="text-lg">
              {CATEGORY_ICONS[badgeCategory] ?? "\u{1F3C6}"}
            </span>
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className={cn("text-sm font-bold", config.textClass)}>
              {badgeName}
              {founderNumber != null && (
                <span className="ml-1 opacity-70">
                  #{String(founderNumber).padStart(4, "0")}
                </span>
              )}
            </p>
            <p className="text-[10px] text-ash mt-0.5 line-clamp-2">
              {badgeDescription}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 border",
                  config.bgClass,
                  config.textClass,
                  config.borderClass,
                )}
              >
                {config.label}
              </span>
              <Link
                href="/badges"
                className="text-[10px] text-lava-hot hover:underline"
              >
                View badges
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative bottom glow line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.hex}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
