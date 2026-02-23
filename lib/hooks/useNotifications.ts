"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type Notification,
  type NotificationPreferences,
  ApiError,
} from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Notification inbox with polling
// ---------------------------------------------------------------------------

interface UseNotificationsOptions {
  type?: string;
  limit?: number;
  pollInterval?: number; // ms, default 30000 (30s)
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
}

export function useNotifications(opts: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { type, limit = 20, pollInterval = 30_000 } = opts;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<{
        notifications: Notification[];
        unread_count: number;
        total: number;
        page: number;
        limit: number;
      }>("/api/notifications", { page, limit, type });

      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return; // silently skip if logged out
      setError(err instanceof ApiError ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [page, limit, type]);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();

    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchNotifications, pollInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications, pollInterval]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to mark as read");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to mark all as read");
    }
  }, []);

  const dismissNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      throw err instanceof ApiError ? err : new Error("Failed to dismiss notification");
    }
  }, []);

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    page,
    setPage,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ preferences: NotificationPreferences }>(
        "/api/notifications/preferences",
      );
      setPreferences(data.preferences);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof ApiError ? err.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      try {
        await api.put("/api/notifications/preferences", prefs);
        setPreferences((prev) => (prev ? { ...prev, ...prefs } : null));
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to update preferences";
        setError(msg);
        throw err;
      }
    },
    [],
  );

  return { preferences, loading, error, updatePreferences, refresh };
}

// ---------------------------------------------------------------------------
// Push subscription management
// ---------------------------------------------------------------------------

interface UsePushSubscriptionReturn {
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
}

export function usePushSubscription(): UsePushSubscriptionReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => { /* push not supported */ });
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await api.post("/api/notifications/push-subscribe", { subscription: sub.toJSON() });
      setIsSubscribed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to subscribe to push";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await api.delete("/api/notifications/push-subscribe", {
          endpoint: sub.endpoint,
        });
      }
      setIsSubscribed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to unsubscribe from push";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { subscribe, unsubscribe, isSubscribed, loading, error };
}
