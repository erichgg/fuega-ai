"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { useNotificationContext } from "@/lib/contexts/notification-context";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { unreadCount, enabled } = useNotificationContext();

  if (!enabled) return null;

  return (
    <button
      className={cn(
        "relative p-2 text-ash hover:text-lava-hot transition-colors",
        className,
      )}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center bg-lava-hot px-1 text-[10px] font-bold text-black"
          aria-hidden="true"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
