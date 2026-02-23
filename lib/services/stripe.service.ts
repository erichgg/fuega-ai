import Stripe from "stripe";

// ─── Singleton Stripe client ────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// ─── Webhook signature verification ─────────────────────────

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

// ─── Create Checkout Session ────────────────────────────────

export interface CheckoutParams {
  userId: string;
  cosmeticId: string;
  cosmeticName: string;
  priceCents: number;
}

export async function createCheckoutSession(
  params: CheckoutParams
): Promise<string> {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: params.cosmeticName,
            metadata: { cosmetic_id: params.cosmeticId },
          },
          unit_amount: params.priceCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: params.userId,
      cosmetic_id: params.cosmeticId,
    },
    success_url: `${appUrl}/shop?purchased=${params.cosmeticId}`,
    cancel_url: `${appUrl}/shop`,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return session.url;
}

// ─── Create Tip Checkout Session ─────────────────────────────

export interface TipCheckoutParams {
  userId: string;
  amountCents: number;
  recurring: boolean;
  message: string | null;
}

export async function createTipCheckoutSession(
  params: TipCheckoutParams
): Promise<string> {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const metadata: Record<string, string> = {
    user_id: params.userId,
    type: "tip",
    recurring: String(params.recurring),
  };
  if (params.message) {
    metadata.message = params.message.slice(0, 500);
  }

  if (params.recurring) {
    // Subscription mode for recurring tips
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Monthly Tip — fuega.ai",
            },
            unit_amount: params.amountCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${appUrl}/supporters?thanks=recurring`,
      cancel_url: `${appUrl}/supporters`,
    });

    if (!session.url) {
      throw new Error("Failed to create tip checkout session URL");
    }
    return session.url;
  }

  // One-time payment mode
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tip — fuega.ai",
          },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata,
    success_url: `${appUrl}/supporters?thanks=one-time`,
    cancel_url: `${appUrl}/supporters`,
  });

  if (!session.url) {
    throw new Error("Failed to create tip checkout session URL");
  }
  return session.url;
}

// ─── Cancel Stripe Subscription ─────────────────────────────

export async function cancelStripeSubscription(
  subscriptionId: string
): Promise<void> {
  const stripe = getStripe();
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// ─── Get Stripe Subscription ────────────────────────────────

export async function getStripeSubscription(
  subscriptionId: string
): Promise<{ status: string; current_period_end: number } | null> {
  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    // Stripe v20 returns Response<Subscription> — access data properties
    const subData = sub as unknown as {
      status: string;
      current_period_end: number;
    };
    return {
      status: subData.status,
      current_period_end: subData.current_period_end,
    };
  } catch {
    return null;
  }
}

// ─── Create Refund ──────────────────────────────────────────

export async function createRefund(
  paymentIntentId: string
): Promise<Stripe.Refund> {
  const stripe = getStripe();
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}

// ─── Get Payment Intent from Checkout Session ───────────────

export async function getPaymentIntentFromSession(
  sessionId: string
): Promise<string | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  if (session.payment_intent && typeof session.payment_intent === "object") {
    return session.payment_intent.id;
  }
  return null;
}
