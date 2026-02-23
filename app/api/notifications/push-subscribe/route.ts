import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  subscribePush,
  unsubscribePush,
} from "@/lib/services/push-notifications";

const pushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url("Invalid endpoint URL"),
    keys: z.object({
      p256dh: z.string().min(1, "p256dh key is required"),
      auth: z.string().min(1, "auth key is required"),
    }),
  }),
});

const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().optional(),
});

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

    const rateLimit = await checkGeneralRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = pushSubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.errors[0]?.message ?? "Invalid input",
          code: "INVALID_INPUT",
        },
        { status: 400 }
      );
    }

    const result = await subscribePush(user.userId, parsed.data.subscription);
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

    const rateLimit = await checkGeneralRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    let endpoint: string | undefined;
    try {
      const body = await req.json();
      const parsed = pushUnsubscribeSchema.safeParse(body);
      if (parsed.success) {
        endpoint = parsed.data.endpoint;
      }
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
