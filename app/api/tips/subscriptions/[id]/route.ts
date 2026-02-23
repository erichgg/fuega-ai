import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { cancelStripeSubscription } from "@/lib/services/stripe.service";
import {
  findUserBySubscriptionId,
  revokeRecurringSupporterBadge,
} from "@/lib/services/tips.service";

/**
 * DELETE /api/tips/subscriptions/:id
 * Cancel a recurring tip subscription (at period end).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFeatureEnabled("ENABLE_TIP_JAR")) {
      return NextResponse.json(
        { error: "Tip jar is not available", code: "FEATURE_DISABLED" },
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

    const { id: subscriptionId } = await params;

    // Verify user owns this subscription
    const ownerId = await findUserBySubscriptionId(subscriptionId);
    if (!ownerId || ownerId !== user.userId) {
      return NextResponse.json(
        { error: "Subscription not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Cancel at period end via Stripe
    await cancelStripeSubscription(subscriptionId);

    // Revoke recurring supporter badge
    await revokeRecurringSupporterBadge(user.userId);

    console.log(
      `[tips/subscriptions] Cancelled subscription ${subscriptionId} for user ${user.userId}`
    );

    return NextResponse.json({
      cancelled: true,
      message: "Subscription will end at the current billing period",
    });
  } catch (err) {
    console.error("[tips/subscriptions/cancel] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
