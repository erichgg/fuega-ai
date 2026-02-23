"use client";

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
 */
export function useSetActiveCosmetic(): UseSetActiveCosmeticReturn {
  return {
    setActive: async () => {
      throw new Error("Cosmetics are not available in V1");
    },
    loading: false,
    error: null,
  };
}
