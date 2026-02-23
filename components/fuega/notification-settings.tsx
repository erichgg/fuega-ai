"use client";

import * as React from "react";
import { BellRing, BellOff } from "lucide-react";
import {
  useNotificationPreferences,
  usePushSubscription,
} from "@/lib/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import type { NotificationPreferences } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Toggle switch (inline — no shadcn switch component)
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center border transition-colors",
        checked
          ? "bg-lava-hot border-lava-hot"
          : "bg-charcoal border-smoke/30",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transition-transform bg-black",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Preference row
// ---------------------------------------------------------------------------

function PreferenceRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-smoke mt-0.5">{description}</p>
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        label={label}
        disabled={disabled}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification types config
// ---------------------------------------------------------------------------

interface NotifTypeConfig {
  key: keyof NotificationPreferences;
  pushKey?: keyof NotificationPreferences;
  label: string;
  description: string;
}

const NOTIFICATION_TYPES: NotifTypeConfig[] = [
  {
    key: "reply_post",
    pushKey: "push_reply_post",
    label: "Post replies",
    description: "Someone comments on your post",
  },
  {
    key: "reply_comment",
    pushKey: "push_reply_comment",
    label: "Comment replies",
    description: "Someone replies to your comment",
  },
  {
    key: "spark",
    pushKey: "push_spark",
    label: "Sparks",
    description: "Someone sparks your post or comment",
  },
  {
    key: "mention",
    pushKey: "push_mention",
    label: "Mentions",
    description: "Someone mentions your username",
  },
  {
    key: "campfire_update",
    label: "Campfire updates",
    description: "News or changes in your campfires",
  },
  {
    key: "governance",
    pushKey: "push_governance",
    label: "Governance",
    description: "New proposals and vote results",
  },
  {
    key: "badge_earned",
    pushKey: "push_badge_earned",
    label: "Badges",
    description: "You earn a new badge",
  },
  {
    key: "tip_received",
    label: "Tips received",
    description: "Someone tips you directly (future)",
  },
  {
    key: "referral",
    pushKey: "push_referral",
    label: "Referrals",
    description: "Someone joins using your referral link",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationSettings() {
  const { preferences, loading, error, updatePreferences } =
    useNotificationPreferences();
  const {
    subscribe,
    unsubscribe,
    isSubscribed,
    loading: pushLoading,
    error: pushError,
  } = usePushSubscription();
  const [saving, setSaving] = React.useState(false);

  async function handleToggle(
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    setSaving(true);
    try {
      await updatePreferences({ [key]: value });
    } catch {
      // Error displayed via hook
    } finally {
      setSaving(false);
    }
  }

  async function handlePushToggle() {
    if (isSubscribed) {
      await unsubscribe();
      if (preferences?.push_enabled) {
        await updatePreferences({ push_enabled: false });
      }
    } else {
      await subscribe();
      await updatePreferences({ push_enabled: true });
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-smoke">
          <span className="text-lava-hot font-bold">$ </span>
          loading preferences...
          <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive">
          <span className="font-bold">$ error: </span>
          {error}
        </p>
      </div>
    );
  }

  if (!preferences) return null;

  const pushSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          <span className="text-lava-hot font-bold">$ </span>
          notification settings
        </h1>
        <p className="text-xs text-ash mt-1">
          Control which notifications you receive.
        </p>
      </div>

      {/* In-app notifications */}
      <div className="terminal-card">
        <div className="px-4 py-3 border-b border-lava-hot/20">
          <h2 className="text-sm font-semibold text-foreground">
            In-app notifications
          </h2>
          <p className="text-xs text-smoke mt-0.5">
            Notifications shown in your inbox and bell icon.
          </p>
        </div>
        <div className="px-4 divide-y divide-lava-hot/10">
          {NOTIFICATION_TYPES.map((t) => (
            <PreferenceRow
              key={t.key}
              label={t.label}
              description={t.description}
              checked={preferences[t.key] as boolean}
              onChange={(val) => handleToggle(t.key, val)}
              disabled={saving}
            />
          ))}
        </div>
      </div>

      {/* Push notifications */}
      <div className="terminal-card">
        <div className="px-4 py-3 border-b border-lava-hot/20">
          <h2 className="text-sm font-semibold text-foreground">
            Desktop push notifications
          </h2>
          <p className="text-xs text-smoke mt-0.5">
            Get notified even when you&apos;re not on the site.
          </p>
        </div>
        <div className="px-4 py-4">
          {!pushSupported ? (
            <p className="text-xs text-smoke">
              Your browser does not support push notifications.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Master push toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSubscribed ? (
                    <BellRing className="h-4 w-4 text-lava-hot" />
                  ) : (
                    <BellOff className="h-4 w-4 text-smoke" />
                  )}
                  <span className="text-sm text-foreground">
                    {isSubscribed
                      ? "Push notifications enabled"
                      : "Push notifications disabled"}
                  </span>
                </div>
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  size="sm"
                  onClick={handlePushToggle}
                  disabled={pushLoading}
                >
                  {pushLoading
                    ? "..."
                    : isSubscribed
                      ? "Disable"
                      : "Enable"}
                </Button>
              </div>

              {pushError && (
                <p className="text-xs text-destructive">{pushError}</p>
              )}

              {/* Per-type push toggles (only when push is enabled) */}
              {isSubscribed && (
                <div className="divide-y divide-lava-hot/10 border-t border-lava-hot/10 pt-2">
                  {NOTIFICATION_TYPES.filter((t) => t.pushKey).map((t) => (
                    <PreferenceRow
                      key={t.pushKey}
                      label={`Push: ${t.label}`}
                      description={`Desktop notification for ${t.label.toLowerCase()}`}
                      checked={
                        preferences[t.pushKey as keyof NotificationPreferences] as boolean
                      }
                      onChange={(val) =>
                        handleToggle(
                          t.pushKey as keyof NotificationPreferences,
                          val,
                        )
                      }
                      disabled={saving}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
