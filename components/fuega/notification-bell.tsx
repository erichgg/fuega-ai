"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { useNotificationContext } from "@/lib/contexts/notification-context";
import { NotificationDropdown } from "@/components/fuega/notification-dropdown";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { unreadCount, enabled } = useNotificationContext();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  if (!enabled) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={cn(
          "relative p-2 text-ash hover:text-lava-hot transition-colors",
          dropdownOpen && "text-lava-hot",
          className,
        )}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
        aria-expanded={dropdownOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lava-hot px-1 text-[10px] font-bold text-black"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationDropdown
        open={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
      />
    </div>
  );
}
