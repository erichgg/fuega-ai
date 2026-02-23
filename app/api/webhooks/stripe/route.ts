import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/services/stripe.service";
import {
  recordPurchase,
  markRefunded,
  removeFromActive,
} from "@/lib/services/cosmetics.service";
import {
  recordTip,
  awardSupporterBadge,
  awardRecurringSupporterBadge,
  revokeRecurringSupporterBadge,
  findUserBySubscriptionId,
  notifyTipReceived,
} from "@/lib/services/tips.service";

/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler.
 * Handles cosmetics purchases, refunds, and tip jar events.
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
        const metaType = session.metadata?.type;

        // ── Tip checkout (one-time) ──
        if (metaType === "tip" && userId) {
          const amountTotal = session.amount_total ?? 0;
          let paymentIntentId = "unknown";
          if (typeof session.payment_intent === "string") {
            paymentIntentId = session.payment_intent;
          }

          const recurring = session.metadata?.recurring === "true";
          const message = session.metadata?.message ?? null;

          if (!recurring) {
            // One-time tip completed
            await recordTip(
              userId,
              amountTotal,
              paymentIntentId,
              false,
              null,
              message
            );
            await awardSupporterBadge(userId);
            await notifyTipReceived(userId, amountTotal, false);
            console.log(
              `[stripe-webhook] One-time tip recorded: user=${userId} amount=${amountTotal} payment=${paymentIntentId}`
            );
          }
          // Recurring tip checkout creates a subscription — first payment
          // handled by invoice.paid below
          break;
        }

        // ── Cosmetic purchase ──
        const cosmeticId = session.metadata?.cosmetic_id;
        if (!userId || !cosmeticId) {
          console.error("Webhook missing metadata:", {
            userId,
            cosmeticId,
          });
          break;
        }

        let paymentIntentId: string | null = null;
        if (typeof session.payment_intent === "string") {
          paymentIntentId = session.payment_intent;
        }

        const amountTotal = session.amount_total ?? 0;
        await recordPurchase(userId, cosmeticId, amountTotal, paymentIntentId);

        console.log(
          `[stripe-webhook] Purchase recorded: user=${userId} cosmetic=${cosmeticId} payment=${paymentIntentId}`
        );
        break;
      }

      // ── Recurring tip: invoice paid (first + subsequent months) ──
      case "invoice.paid": {
        // Stripe v20 types are narrow — cast to access invoice fields
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : null;

        if (!subscriptionId) break;

        // Get metadata from subscription (Stripe propagates it)
        const subDetails = invoice.subscription_details as
          | { metadata?: Record<string, string> }
          | undefined;
        const subMeta = subDetails?.metadata;
        const userId = subMeta?.user_id;

        if (!userId || subMeta?.type !== "tip") break;

        const amountPaid = (invoice.amount_paid as number) ?? 0;
        const paymentIntentId =
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : `inv_${invoice.id}`;
        const message = subMeta?.message ?? null;

        await recordTip(
          userId,
          amountPaid,
          paymentIntentId,
          true,
          subscriptionId,
          message
        );
        await awardSupporterBadge(userId);
        await awardRecurringSupporterBadge(userId);
        await notifyTipReceived(userId, amountPaid, true);

        console.log(
          `[stripe-webhook] Recurring tip recorded: user=${userId} amount=${amountPaid} sub=${subscriptionId}`
        );
        break;
      }

      // ── Subscription cancelled ──
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const userId = await findUserBySubscriptionId(subscriptionId);
        if (userId) {
          await revokeRecurringSupporterBadge(userId);
          console.log(
            `[stripe-webhook] Subscription deleted: user=${userId} sub=${subscriptionId}`
          );
        }
        break;
      }

      // ── Payment failed on recurring tip ──
      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : null;
        console.warn(
          `[stripe-webhook] Payment failed: sub=${subscriptionId} invoice=${invoice.id}. Stripe will retry.`
        );
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const chargePaymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : null;

        if (!chargePaymentIntentId) {
          console.error("Webhook charge.refunded missing payment_intent");
          break;
        }

        const { queryOne } = await import("@/lib/db");
        const record = await queryOne<{
          user_id: string;
          cosmetic_id: string;
        }>(
          `SELECT user_id, cosmetic_id FROM user_cosmetics
           WHERE stripe_payment_id = $1 AND refunded = FALSE`,
          [chargePaymentIntentId]
        );

        if (record) {
          await markRefunded(record.user_id, record.cosmetic_id);
          await removeFromActive(record.user_id, record.cosmetic_id);
          console.log(
            `[stripe-webhook] Refund recorded: user=${record.user_id} cosmetic=${record.cosmetic_id}`
          );
        } else {
          console.warn(
            `[stripe-webhook] No matching purchase for payment_intent=${chargePaymentIntentId}`
          );
        }
        break;
      }

      default:
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
