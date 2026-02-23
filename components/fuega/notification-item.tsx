"use client";

import * as React from "react";
import Link from "next/link";
import {
  MessageSquare,
  Reply,
  Flame,
  AtSign,
  Users,
  Vote,
  Star,
  Heart,
  UserPlus,
  Bell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Type-specific icon map
// ---------------------------------------------------------------------------

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  reply_post: MessageSquare,
  reply_comment: Reply,
  spark: Flame,
  mention: AtSign,
  campfire_update: Users,
  governance: Vote,
  badge_earned: Star,
  tip_received: Heart,
  referral: UserPlus,
};

function getIcon(type: string): React.ElementType {
  return NOTIFICATION_ICONS[type] ?? Bell;
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  /** When true, shows dismiss button */
  showDismiss?: boolean;
  /** Compact mode for dropdown vs full mode for inbox */
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onRead,
  onDismiss,
  showDismiss = false,
  compact = false,
}: NotificationItemProps) {
  const Icon = getIcon(notification.type);
  const bodyPreview =
    notification.body.length > 100
      ? notification.body.slice(0, 100) + "..."
      : notification.body;

  function handleClick() {
    if (!notification.read && onRead) {
      onRead(notification.id);
    }
  }

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onDismiss?.(notification.id);
  }

  return (
    <Link
      href={notification.action_url || "#"}
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors group relative",
        compact ? "py-2.5" : "py-3",
        notification.read
          ? "hover:bg-charcoal/50"
          : "bg-lava-hot/5 hover:bg-lava-hot/10",
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-lava-hot"
          aria-label="Unread"
        />
      )}

      {/* Type icon */}
      <div
        className={cn(
          "shrink-0 mt-0.5",
          notification.type === "spark"
            ? "text-lava-hot"
            : notification.type === "badge_earned"
              ? "text-lava-mid"
              : "text-ash",
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.read
              ? "text-ash"
              : "text-foreground font-medium",
          )}
        >
          {notification.title}
        </p>
        {!compact && (
          <p className="text-xs text-smoke mt-0.5 line-clamp-2">
            {bodyPreview}
          </p>
        )}
        <p className="text-[10px] text-smoke mt-1">
          {relativeTime(notification.created_at)}
        </p>
      </div>

      {/* Dismiss button */}
      {showDismiss && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-smoke hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </Link>
  );
}
