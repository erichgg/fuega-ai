import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getUserSubscriptions } from "@/lib/services/tips.service";
import { getStripeSubscription } from "@/lib/services/stripe.service";

/**
 * GET /api/tips/subscriptions
 * Returns the authenticated user's active recurring tip subscriptions.
 */
export async function GET(req: Request) {
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

    const localSubs = await getUserSubscriptions(user.userId);

    // Enrich with live Stripe data
    const subscriptions = await Promise.all(
      localSubs.map(async (sub) => {
        const stripeSub = await getStripeSubscription(
          sub.stripe_subscription_id
        );
        if (!stripeSub) {
          return { ...sub, status: "unknown" };
        }
        return {
          ...sub,
          status: stripeSub.status,
          current_period_end: new Date(
            stripeSub.current_period_end * 1000
          ).toISOString(),
        };
      })
    );

    // Only return active/trialing subscriptions
    const active = subscriptions.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );

    return NextResponse.json({ subscriptions: active });
  } catch (err) {
    console.error("[tips/subscriptions] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
