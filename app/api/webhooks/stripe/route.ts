import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/services/stripe.service";
import {
  recordPurchase,
  markRefunded,
  removeFromActive,
} from "@/lib/services/cosmetics.service";

/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler.
 * Verifies signature, processes checkout.session.completed and charge.refunded.
 * Always returns 200 to acknowledge receipt.
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Handle event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const cosmeticId = session.metadata?.cosmetic_id;

        if (!userId || !cosmeticId) {
          console.error("Webhook missing metadata:", { userId, cosmeticId });
          break;
        }

        // Extract payment intent ID
        let paymentIntentId: string | null = null;
        if (typeof session.payment_intent === "string") {
          paymentIntentId = session.payment_intent;
        }

        // Get amount paid from session
        const amountTotal = session.amount_total ?? 0;

        // Record purchase in DB
        await recordPurchase(userId, cosmeticId, amountTotal, paymentIntentId);

        console.log(
          `[stripe-webhook] Purchase recorded: user=${userId} cosmetic=${cosmeticId} payment=${paymentIntentId}`
        );
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : null;

        if (!paymentIntentId) {
          console.error("Webhook charge.refunded missing payment_intent");
          break;
        }

        // Find the user_cosmetics record by stripe_payment_id and mark refunded
        // We need to look up by payment ID since charge.refunded doesn't have our metadata
        const { queryOne } = await import("@/lib/db");
        const record = await queryOne<{ user_id: string; cosmetic_id: string }>(
          `SELECT user_id, cosmetic_id FROM user_cosmetics
           WHERE stripe_payment_id = $1 AND refunded = FALSE`,
          [paymentIntentId]
        );

        if (record) {
          await markRefunded(record.user_id, record.cosmetic_id);
          await removeFromActive(record.user_id, record.cosmetic_id);
          console.log(
            `[stripe-webhook] Refund recorded: user=${record.user_id} cosmetic=${record.cosmetic_id}`
          );
        } else {
          console.warn(
            `[stripe-webhook] No matching purchase for payment_intent=${paymentIntentId}`
          );
        }
        break;
      }

      default:
        // Unhandled event type — log but don't fail
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    // Return 200 anyway to prevent Stripe retries on internal errors
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}
