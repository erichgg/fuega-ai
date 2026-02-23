"use client";

import * as React from "react";
import { CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { NotificationItem } from "@/components/fuega/notification-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Notification type filter
// ---------------------------------------------------------------------------

const NOTIFICATION_TYPES = [
  { value: "", label: "All" },
  { value: "reply_post", label: "Replies to posts" },
  { value: "reply_comment", label: "Replies to comments" },
  { value: "spark", label: "Sparks" },
  { value: "mention", label: "Mentions" },
  { value: "campfire_update", label: "Campfire updates" },
  { value: "governance", label: "Governance" },
  { value: "badge_earned", label: "Badges" },
  { value: "referral", label: "Referrals" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationInbox() {
  const [filterType, setFilterType] = React.useState("");
  const {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    page,
    setPage,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications({
    type: filterType || undefined,
    limit: 20,
    pollInterval: 30_000,
  });

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            <span className="text-lava-hot font-bold">$ </span>
            notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-xs text-ash mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            className="gap-1.5 self-start"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-lava-hot/20 pb-2">
        {NOTIFICATION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setFilterType(t.value);
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 text-xs transition-colors",
              filterType === t.value
                ? "text-lava-hot border-b-2 border-lava-hot -mb-[9px]"
                : "text-smoke hover:text-ash",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="terminal-card">
        {loading ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-smoke">
              <span className="text-lava-hot font-bold">$ </span>
              loading notifications...
              <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
            </p>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-destructive">
              <span className="font-bold">$ error: </span>
              {error}
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-smoke">
              <span className="text-lava-hot font-bold">$ </span>
              no notifications found
            </p>
            <p className="text-xs text-smoke mt-1">
              {filterType
                ? "Try a different filter."
                : "You're all caught up."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-lava-hot/10">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                onDismiss={dismissNotification}
                showDismiss
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-smoke">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
