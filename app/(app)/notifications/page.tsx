"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { useFeatureFlag } from "@/lib/hooks/useFeatureFlags";
import { useAuth } from "@/lib/contexts/auth-context";
import { NotificationInbox } from "@/components/fuega/notification-inbox";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { enabled, loading } = useFeatureFlag("notifications");

  // Set page title
  React.useEffect(() => {
    document.title = "Notifications | fuega.ai";
  }, []);

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

  if (loading || authLoading) {
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
      <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-charcoal bg-charcoal/30">
          <BellOff className="h-6 w-6 text-smoke" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground font-mono">
            <span className="text-lava-hot">$ </span>
            Notifications coming soon
          </h2>
          <p className="mt-2 text-sm text-ash max-w-sm mx-auto">
            Notifications are not enabled yet. Check back soon -- we are
            working on bringing real-time alerts to your campfire activity.
          </p>
        </div>
        <Link
          href="/home"
          className="mt-2 text-sm text-flame-400 hover:underline"
        >
          Back to Hearth
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6 lg:py-8">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-flame-400" />
        <h1 className="text-lg font-bold text-foreground font-mono">
          Notifications
        </h1>
      </div>
      <NotificationInbox />
    </div>
  );
}
