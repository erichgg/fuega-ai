"use client";

import { useEffect, useState } from "react";
import { api, type FeatureFlags } from "@/lib/api/client";

const DEFAULT_FLAGS: FeatureFlags = {
  badges: false,
  tip_jar: false,
  notifications: false,
};

/**
 * Client-side feature flag checker.
 * Fetches enabled features from /api/features on mount.
 * Returns safe defaults (all false) while loading.
 */
export function useFeatureFlags(): FeatureFlags & { loading: boolean } {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchFlags() {
      try {
        const data = await api.get<FeatureFlags>("/api/features");
        if (!cancelled) setFlags(data);
      } catch {
        // On error, keep defaults (all disabled) — safe state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFlags();
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
