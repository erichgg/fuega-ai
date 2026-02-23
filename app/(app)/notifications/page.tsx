"use client";

import { useFeatureFlag } from "@/lib/hooks/useFeatureFlags";
import { NotificationInbox } from "@/components/fuega/notification-inbox";

export default function NotificationsPage() {
  const { enabled, loading } = useFeatureFlag("notifications");

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-smoke">
          <span className="text-lava-hot font-bold">$ </span>
          loading...
          <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
        </p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-smoke">
          <span className="text-lava-hot font-bold">$ </span>
          notifications are not available yet
        </p>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6 lg:py-8">
      <NotificationInbox />
    </div>
  );
}
