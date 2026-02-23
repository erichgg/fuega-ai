import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createTipCheckoutSession } from "@/lib/services/stripe.service";

const tipCheckoutSchema = z.object({
  amount_cents: z
    .number()
    .int()
    .min(100, "Minimum tip is $1.00")
    .max(100000, "Maximum tip is $1,000.00"),
  recurring: z.boolean().default(false),
  message: z
    .string()
    .max(500, "Message must be 500 characters or less")
    .nullable()
    .optional()
    .default(null),
});

/**
 * POST /api/tips/checkout
 * Create a Stripe Checkout Session for a one-time or recurring tip.
 */
export async function POST(req: Request) {
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

    const body = await req.json();
    const parsed = tipCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.errors[0]?.message ?? "Invalid input",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { amount_cents, recurring, message } = parsed.data;

    const checkoutUrl = await createTipCheckoutSession({
      userId: user.userId,
      amountCents: amount_cents,
      recurring,
      message: message ?? null,
    });

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err) {
    console.error("[tips/checkout] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
