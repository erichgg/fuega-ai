"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Badge, type UserBadge, ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// All badge definitions (public catalog)
// ---------------------------------------------------------------------------

interface UseBadgeCatalogReturn {
  badges: Badge[];
  loading: boolean;
  error: string | null;
}

export function useBadgeCatalog(): UseBadgeCatalogReturn {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const data = await api.get<{ badges: Badge[] }>("/api/badges");
        if (!cancelled) setBadges(data.badges);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load badges");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { badges, loading, error };
}

// ---------------------------------------------------------------------------
// User's earned badges
// ---------------------------------------------------------------------------

interface UseUserBadgesReturn {
  badges: UserBadge[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUserBadges(userId: string | undefined): UseUserBadgesReturn {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ badges: UserBadge[] }>(`/api/users/${userId}/badges`);
      setBadges(data.badges);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load user badges");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { badges, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Set primary badge
// ---------------------------------------------------------------------------

interface UseSetPrimaryBadgeReturn {
  setPrimaryBadge: (userId: string, badgeId: string) => Promise<void>;
  setting: boolean;
  error: string | null;
}

export function useSetPrimaryBadge(): UseSetPrimaryBadgeReturn {
  const [setting, setSetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPrimaryBadge = useCallback(async (userId: string, badgeId: string) => {
    setSetting(true);
    setError(null);
    try {
      await api.put(`/api/users/${userId}/primary-badge`, { badge_id: badgeId });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to set primary badge";
      setError(msg);
      throw err;
    } finally {
      setSetting(false);
    }
  }, []);

  return { setPrimaryBadge, setting, error };
}
