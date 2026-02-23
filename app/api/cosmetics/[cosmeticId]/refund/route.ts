import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getPurchaseRecord,
  countRecentRefunds,
  markRefunded,
  removeFromActive,
} from "@/lib/services/cosmetics.service";
import { createRefund } from "@/lib/services/stripe.service";

const REFUND_WINDOW_DAYS = 7;
const MAX_REFUNDS_PER_30_DAYS = 5;

/**
 * POST /api/cosmetics/:cosmeticId/refund
 * Request a refund for a purchased cosmetic.
 * Auth required. Must own cosmetic. 7-day window. Abuse prevention.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ cosmeticId: string }> }
) {
  try {
    if (!isFeatureEnabled("ENABLE_COSMETICS_SHOP")) {
      return NextResponse.json(
        { error: "Cosmetics shop is not available", code: "FEATURE_DISABLED" },
        { status: 403 }
      );
    }

    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { cosmeticId } = await params;

    // Validate user owns cosmetic
    const purchase = await getPurchaseRecord(user.userId, cosmeticId);
    if (!purchase) {
      return NextResponse.json(
        { error: "You do not own this cosmetic", code: "NOT_OWNED" },
        { status: 404 }
      );
    }

    // Validate refund window (7 calendar days)
    const purchaseDate = new Date(purchase.purchased_at);
    const now = new Date();
    const daysSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSincePurchase > REFUND_WINDOW_DAYS) {
      return NextResponse.json(
        {
          error: `Refund window has expired. Cosmetics can only be refunded within ${REFUND_WINDOW_DAYS} days of purchase.`,
          code: "REFUND_WINDOW_EXPIRED",
        },
        { status: 400 }
      );
    }

    // Abuse prevention: max 5 refunds in 30 days
    const recentRefunds = await countRecentRefunds(user.userId);
    if (recentRefunds >= MAX_REFUNDS_PER_30_DAYS) {
      return NextResponse.json(
        {
          error: "Too many refunds. Please contact support.",
          code: "REFUND_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // Initiate Stripe refund if payment exists
    if (purchase.stripe_payment_id) {
      try {
        await createRefund(purchase.stripe_payment_id);
      } catch (stripeErr) {
        console.error("Stripe refund error:", stripeErr);
        return NextResponse.json(
          { error: "Failed to process refund. Please contact support.", code: "STRIPE_REFUND_FAILED" },
          { status: 502 }
        );
      }
    }

    // Mark as refunded in DB
    await markRefunded(user.userId, cosmeticId);

    // Remove from active cosmetics if applied
    await removeFromActive(user.userId, cosmeticId);

    return NextResponse.json({
      message: "Refund processed successfully",
      cosmetic_id: cosmeticId,
    });
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
