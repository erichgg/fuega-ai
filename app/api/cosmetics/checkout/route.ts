import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getCosmeticById,
  getCatalogItem,
  userOwnsCosmetic,
} from "@/lib/services/cosmetics.service";
import { createCheckoutSession } from "@/lib/services/stripe.service";

/**
 * POST /api/cosmetics/checkout
 * Create a Stripe Checkout Session for a cosmetic purchase.
 * Auth required. Feature flag check.
 * Body: { cosmetic_id: string }
 */
export async function POST(req: Request) {
  try {
    // Feature flag check
    if (!isFeatureEnabled("ENABLE_COSMETICS_SHOP")) {
      return NextResponse.json(
        { error: "Cosmetics shop is not available", code: "FEATURE_DISABLED" },
        { status: 403 }
      );
    }

    // Auth
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Parse body
    const body = await req.json();
    const cosmeticId = body?.cosmetic_id;
    if (!cosmeticId || typeof cosmeticId !== "string") {
      return NextResponse.json(
        { error: "cosmetic_id is required", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    // Validate cosmetic exists and is available
    // Use DB first, fall back to static catalog for price
    let cosmeticName: string;
    let priceCents: number;

    const dbCosmetic = await getCosmeticById(cosmeticId).catch(() => null);
    if (dbCosmetic) {
      if (!dbCosmetic.available) {
        return NextResponse.json(
          { error: "Cosmetic is not available for purchase", code: "COSMETIC_UNAVAILABLE" },
          { status: 400 }
        );
      }
      cosmeticName = dbCosmetic.name;
      priceCents = dbCosmetic.price_cents;
    } else {
      // Fall back to static catalog
      const catalogItem = getCatalogItem(cosmeticId);
      if (!catalogItem || !catalogItem.available) {
        return NextResponse.json(
          { error: "Cosmetic not found", code: "COSMETIC_NOT_FOUND" },
          { status: 404 }
        );
      }
      cosmeticName = catalogItem.name;
      priceCents = catalogItem.price_cents;
    }

    // Check user doesn't already own it
    const alreadyOwned = await userOwnsCosmetic(user.userId, cosmeticId);
    if (alreadyOwned) {
      return NextResponse.json(
        { error: "You already own this cosmetic", code: "ALREADY_OWNED" },
        { status: 409 }
      );
    }

    // Create Stripe Checkout Session — price from SERVER, never client
    const checkoutUrl = await createCheckoutSession({
      userId: user.userId,
      cosmeticId,
      cosmeticName,
      priceCents,
    });

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
