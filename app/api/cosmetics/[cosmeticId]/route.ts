import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCosmeticById, getCatalogItem } from "@/lib/services/cosmetics.service";

/**
 * GET /api/cosmetics/:cosmeticId
 * Get single cosmetic with full metadata.
 * Public — no auth required.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cosmeticId: string }> }
) {
  try {
    if (!isFeatureEnabled("ENABLE_COSMETICS_SHOP")) {
      return NextResponse.json(
        { error: "Cosmetics shop is not available", code: "FEATURE_DISABLED" },
        { status: 404 }
      );
    }

    const { cosmeticId } = await params;

    // Try DB first, fall back to static catalog
    let cosmetic;
    try {
      cosmetic = await getCosmeticById(cosmeticId);
    } catch {
      const catalogItem = getCatalogItem(cosmeticId);
      if (catalogItem) {
        cosmetic = catalogItem;
      }
    }

    if (!cosmetic) {
      return NextResponse.json(
        { error: "Cosmetic not found", code: "COSMETIC_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { cosmetic },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      }
    );
  } catch (err) {
    console.error("Get cosmetic error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
