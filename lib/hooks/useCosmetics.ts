"use client";

import { useState } from "react";

/**
 * Cosmetics hooks — CUT FROM V1.
 * Cosmetics require anonymous payment support which isn't available yet.
 * These stubs exist so the import paths work and can be filled in post-launch.
 * See GAMIFICATION.md Appendix B.
 */

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  type: "username_color" | "profile_border" | "post_background" | "emoji_pack";
  price_cents: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  preview_url: string;
}

interface UseCosmeticsReturn {
  catalog: CosmeticItem[];
  owned: CosmeticItem[];
  active: Record<string, string>;
  loading: boolean;
  error: string | null;
}

/**
 * Stub — returns empty state. Cosmetics are cut from V1.
 */
export function useCosmetics(): UseCosmeticsReturn {
  return {
    catalog: [],
    owned: [],
    active: {},
    loading: false,
    error: null,
  };
}

interface UseSetActiveCosmeticReturn {
  setActive: (type: string, cosmeticId: string | null) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Stub — no-op. Cosmetics are cut from V1.
 * Returns gracefully instead of throwing to avoid crashing callers.
 */
export function useSetActiveCosmetic(): UseSetActiveCosmeticReturn {
  const [error, setError] = useState<string | null>(null);

  return {
    setActive: async () => {
      setError("Cosmetics are not available yet");
      // No-op: cosmetics are cut from V1
    },
    loading: false,
    error,
  };
}
