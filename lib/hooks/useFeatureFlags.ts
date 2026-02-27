"use client";

import { useEffect, useState } from "react";
import { api, type FeatureFlags } from "@/lib/api/client";

const DEFAULT_FLAGS: FeatureFlags = {
  badges: false,
  tip_jar: false,
  notifications: false,
};

// Module-level cache so multiple components sharing useFeatureFlags/useFeatureFlag
// don't each trigger their own fetch.
let flagsCache: FeatureFlags | null = null;
let fetchPromise: Promise<FeatureFlags> | null = null;

function fetchFlagsOnce(): Promise<FeatureFlags> {
  if (flagsCache) return Promise.resolve(flagsCache);
  if (fetchPromise) return fetchPromise;

  fetchPromise = api
    .get<FeatureFlags>("/api/features")
    .then((data) => {
      flagsCache = data;
      return data;
    })
    .catch(() => {
      // On error, keep defaults (all disabled) — safe state
      return DEFAULT_FLAGS;
    })
    .finally(() => {
      // Allow retry after 60s if the fetch failed and cache is still empty
      setTimeout(() => {
        if (!flagsCache) fetchPromise = null;
      }, 60_000);
    });

  return fetchPromise;
}

/**
 * Client-side feature flag checker.
 * Fetches enabled features from /api/features on mount.
 * Returns safe defaults (all false) while loading.
 * Uses a module-level cache so multiple components share a single fetch.
 */
export function useFeatureFlags(): FeatureFlags & { loading: boolean } {
  const [flags, setFlags] = useState<FeatureFlags>(flagsCache ?? DEFAULT_FLAGS);
  const [loading, setLoading] = useState(!flagsCache);

  useEffect(() => {
    if (flagsCache) {
      setFlags(flagsCache);
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchFlagsOnce().then((data) => {
      if (!cancelled) {
        setFlags(data);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { ...flags, loading };
}

/**
 * Check a single feature flag.
 */
export function useFeatureFlag(
  flag: keyof FeatureFlags,
): { enabled: boolean; loading: boolean } {
  const flags = useFeatureFlags();
  return { enabled: flags[flag], loading: flags.loading };
}
