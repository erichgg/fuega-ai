import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  subscribePush,
  unsubscribePush,
  type PushSubscriptionData,
} from "@/lib/services/push-notifications";

/**
 * POST /api/notifications/push-subscribe
 * Register a push subscription. Auth required.
 * Body: { subscription: PushSubscription }
 */
export async function POST(req: Request) {
  try {
    if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
      return NextResponse.json(
        { error: "Notifications are not enabled", code: "FEATURE_DISABLED" },
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

    const body = await req.json() as { subscription: PushSubscriptionData };
    if (!body.subscription) {
      return NextResponse.json(
        { error: "subscription is required", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const result = await subscribePush(user.userId, body.subscription);
    return NextResponse.json({ subscription: { id: result.id, endpoint: result.endpoint } }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const serviceErr = err as Error & { code: string; status: number };
      return NextResponse.json(
        { error: serviceErr.message, code: serviceErr.code },
        { status: serviceErr.status }
      );
    }
    console.error("Push subscribe error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/push-subscribe
 * Remove push subscription. Auth required.
 * Body: { endpoint?: string } — if omitted, removes all subscriptions.
 */
export async function DELETE(req: Request) {
  try {
    if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
      return NextResponse.json(
        { error: "Notifications are not enabled", code: "FEATURE_DISABLED" },
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

    let endpoint: string | undefined;
    try {
      const body = await req.json() as { endpoint?: string };
      endpoint = body.endpoint;
    } catch {
      // No body is fine — will remove all subscriptions
    }

    await unsubscribePush(user.userId, endpoint);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const serviceErr = err as Error & { code: string; status: number };
      return NextResponse.json(
        { error: serviceErr.message, code: serviceErr.code },
        { status: serviceErr.status }
      );
    }
    console.error("Push unsubscribe error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
