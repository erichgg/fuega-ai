"use client";

import Link from "next/link";
import { useFeatureFlag } from "@/lib/hooks/useFeatureFlags";
import { useAuth } from "@/lib/contexts/auth-context";
import { NotificationInbox } from "@/components/fuega/notification-inbox";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { enabled, loading } = useFeatureFlag("notifications");

  if (!authLoading && !user) {
    return (
      <div className="py-16 text-center">
        <p className="text-ash">
          You need to{" "}
          <Link href="/login" className="text-flame-400 hover:underline">log in</Link>
          {" "}to access this page.
        </p>
      </div>
    );
  }

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
