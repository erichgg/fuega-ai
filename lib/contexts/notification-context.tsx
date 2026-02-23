"use client";

import * as React from "react";
import { api, type Notification, type FeatureFlags, ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationContextValue {
  /** Unread notification count (0 when notifications disabled). */
  unreadCount: number;
  /** Whether the notification system is enabled via feature flags. */
  enabled: boolean;
  /** Recent notifications for the dropdown (last 20). */
  recent: Notification[];
  /** Loading state for initial fetch. */
  loading: boolean;
  /** Force refresh of unread count + recent notifications. */
  refresh: () => Promise<void>;
  /** Mark a single notification as read (optimistic update). */
  markAsRead: (id: string) => Promise<void>;
  /** Mark all notifications as read. */
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotificationContext(): NotificationContextValue {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 30_000; // 30 seconds

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [recent, setRecent] = React.useState<Notification[]>([]);
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Check feature flag on mount
  React.useEffect(() => {
    let cancelled = false;

    async function checkFeature() {
      try {
        const flags = await api.get<FeatureFlags>("/api/features");
        if (!cancelled) setEnabled(flags.notifications);
      } catch {
        // Feature check failed — keep disabled
      }
    }

    checkFeature();
    return () => { cancelled = true; };
  }, []);

  const fetchNotifications = React.useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<{
        notifications: Notification[];
        unread_count: number;
        total: number;
      }>("/api/notifications", { limit: 20, page: 1 });

      setRecent(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      // Silently fail — if user is logged out, 401 is expected
      if (err instanceof ApiError && err.status !== 401) {
        console.error("Notification fetch error:", err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch + polling
  React.useEffect(() => {
    fetchNotifications();

    if (enabled) {
      intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications, enabled]);

  const markAsRead = React.useCallback(
    async (id: string) => {
      // Optimistic update
      setRecent((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await api.put(`/api/notifications/${id}/read`);
      } catch {
        // Revert on failure
        await fetchNotifications();
      }
    },
    [fetchNotifications],
  );

  const markAllAsRead = React.useCallback(async () => {
    // Optimistic update
    setRecent((prev) =>
      prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })),
    );
    setUnreadCount(0);

    try {
      await api.put("/api/notifications/read-all");
    } catch {
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const value = React.useMemo(
    () => ({
      unreadCount,
      enabled,
      recent,
      loading,
      refresh: fetchNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [unreadCount, enabled, recent, loading, fetchNotifications, markAsRead, markAllAsRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
