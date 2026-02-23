import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  listCosmetics,
  COSMETICS_CATALOG,
  type CosmeticRow,
  type CosmeticDefinition,
} from "@/lib/services/cosmetics.service";

interface CosmeticListItem {
  cosmetic_id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price_cents: number;
  metadata: Record<string, unknown>;
}

/**
 * GET /api/cosmetics
 * List all available cosmetics grouped by category.
 * Public — no auth required.
 * Falls back to static catalog if DB is unavailable.
 */
export async function GET() {
  try {
    if (!isFeatureEnabled("ENABLE_COSMETICS_SHOP")) {
      return NextResponse.json(
        { error: "Cosmetics shop is not available", code: "FEATURE_DISABLED" },
        { status: 404 }
      );
    }

    let rawCosmetics: (CosmeticRow | CosmeticDefinition)[];
    try {
      rawCosmetics = await listCosmetics();
    } catch {
      rawCosmetics = COSMETICS_CATALOG.filter((c) => c.available);
    }

    // Normalize to common shape
    const cosmetics: CosmeticListItem[] = rawCosmetics.map((c) => ({
      cosmetic_id: c.cosmetic_id,
      name: c.name,
      description: c.description,
      category: c.category,
      subcategory: c.subcategory,
      price_cents: c.price_cents,
      metadata: c.metadata,
    }));

    // Group by category:subcategory
    const grouped: Record<string, CosmeticListItem[]> = {};
    for (const item of cosmetics) {
      const key = `${item.category}:${item.subcategory}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return NextResponse.json(
      { cosmetics: grouped, total: cosmetics.length },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      }
    );
  } catch (err) {
    console.error("List cosmetics error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
