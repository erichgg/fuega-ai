"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { useNotificationContext } from "@/lib/contexts/notification-context";
import { NotificationItem } from "@/components/fuega/notification-item";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ open, onClose }: NotificationDropdownProps) {
  const { recent, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotificationContext();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    // Delay to avoid closing on the bell click itself
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-coal border border-lava-hot/20 shadow-[0_0_20px_var(--void-shadow)] z-50"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-lava-hot/20">
        <h3 className="text-sm font-semibold text-foreground">
          <span className="text-lava-hot font-bold">$ </span>
          notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-lava-hot">
              ({unreadCount} unread)
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 text-xs text-ash hover:text-lava-hot transition-colors"
            aria-label="Mark all as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-smoke">
              <span className="text-lava-hot font-bold">$ </span>
              loading...
              <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
            </p>
          </div>
        ) : recent.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-smoke">
              <span className="text-lava-hot font-bold">$ </span>
              no notifications
            </p>
            <p className="text-xs text-smoke mt-1">
              You&apos;re all caught up.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-lava-hot/10">
            {recent.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {recent.length > 0 && (
        <div className="border-t border-lava-hot/20">
          <Link
            href="/notifications"
            onClick={onClose}
            className="block px-4 py-2.5 text-xs text-center text-ash hover:text-lava-hot hover:bg-charcoal/50 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
