"""Stripe webhook handler — NO auth dependency (Stripe sends events directly)."""
from datetime import datetime

import stripe
import structlog
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import get_settings
from backend.app.database.engine import AsyncSessionLocal
from backend.app.database.models import (
    BillingEvent,
    Subscription,
    SubscriptionStatus,
)

logger = structlog.get_logger()

router = APIRouter()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

STATUS_MAP = {
    "active": SubscriptionStatus.ACTIVE,
    "past_due": SubscriptionStatus.PAST_DUE,
    "canceled": SubscriptionStatus.CANCELED,
    "trialing": SubscriptionStatus.TRIALING,
    "incomplete": SubscriptionStatus.INCOMPLETE,
}


async def _store_event(db, event) -> BillingEvent:
    """Persist a raw Stripe event in the billing_events table."""
    billing_event = BillingEvent(
        stripe_event_id=event["id"],
        event_type=event["type"],
        data=event["data"],
    )
    db.add(billing_event)
    return billing_event


async def _handle_checkout_completed(db, event) -> None:
    """checkout.session.completed -> create or update a Subscription record."""
    session_obj = event["data"]["object"]
    customer_id = session_obj.get("customer")
    subscription_id = session_obj.get("subscription")
    metadata = session_obj.get("metadata", {})
    user_id = metadata.get("fuega_user_id")
    plan = metadata.get("fuega_plan", "unknown")

    if not user_id:
        logger.warning("checkout_no_user_id", event_id=event["id"])
        return

    # Check for existing subscription by customer
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    sub = result.scalar_one_or_none()

    if sub:
        sub.stripe_subscription_id = subscription_id
        sub.plan = plan
        sub.status = SubscriptionStatus.ACTIVE
        sub.updated_at = datetime.utcnow()
    else:
        sub = Subscription(
            user_id=int(user_id),
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
            plan=plan,
            status=SubscriptionStatus.ACTIVE,
        )
        db.add(sub)


async def _handle_subscription_updated(db, event) -> None:
    """customer.subscription.updated -> sync status, plan, and period dates."""
    sub_obj = event["data"]["object"]
    stripe_sub_id = sub_obj.get("id")

    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        logger.warning("subscription_not_found", stripe_sub_id=stripe_sub_id)
        return

    sub.status = STATUS_MAP.get(sub_obj.get("status"), SubscriptionStatus.INCOMPLETE)
    sub.cancel_at_period_end = sub_obj.get("cancel_at_period_end", False)

    # Update period dates (Stripe sends Unix timestamps)
    period_start = sub_obj.get("current_period_start")
    period_end = sub_obj.get("current_period_end")
    if period_start:
        sub.current_period_start = datetime.utcfromtimestamp(period_start)
    if period_end:
        sub.current_period_end = datetime.utcfromtimestamp(period_end)

    # Plan may change on upgrade/downgrade
    items = sub_obj.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id", "")
        settings = get_settings()
        price_to_plan = {
            settings.stripe_starter_price_id: "fuega_starter",
            settings.stripe_growth_price_id: "fuega_growth",
            settings.stripe_pro_price_id: "fuega_pro",
            settings.stripe_enterprise_price_id: "fuega_enterprise",
        }
        if price_id in price_to_plan:
            sub.plan = price_to_plan[price_id]

    sub.updated_at = datetime.utcnow()


async def _handle_subscription_deleted(db, event) -> None:
    """customer.subscription.deleted -> mark as canceled."""
    sub_obj = event["data"]["object"]
    stripe_sub_id = sub_obj.get("id")

    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        logger.warning("subscription_not_found_for_delete", stripe_sub_id=stripe_sub_id)
        return

    sub.status = SubscriptionStatus.CANCELED
    sub.updated_at = datetime.utcnow()


async def _handle_invoice_payment_failed(db, event) -> None:
    """invoice.payment_failed -> mark subscription as past_due."""
    invoice_obj = event["data"]["object"]
    stripe_sub_id = invoice_obj.get("subscription")
    if not stripe_sub_id:
        return

    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.PAST_DUE
        sub.updated_at = datetime.utcnow()


# ---------------------------------------------------------------------------
# Webhook endpoint
# ---------------------------------------------------------------------------

EVENT_HANDLERS = {
    "checkout.session.completed": _handle_checkout_completed,
    "customer.subscription.updated": _handle_subscription_updated,
    "customer.subscription.deleted": _handle_subscription_deleted,
    "invoice.payment_failed": _handle_invoice_payment_failed,
    # invoice.payment_succeeded is stored but needs no special handling beyond logging
}


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Receive and process Stripe webhook events.

    This endpoint has NO auth dependency — Stripe signs the payload and we
    verify the signature using the webhook secret.
    """
    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Verify webhook signature
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.stripe_webhook_secret,
        )
    except ValueError:
        logger.error("stripe_webhook_invalid_payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        logger.error("stripe_webhook_bad_signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info("stripe_webhook_received", event_type=event["type"], event_id=event["id"])

    # Process event inside a DB session
    async with AsyncSessionLocal() as db:
        try:
            # Store every event
            billing_event = await _store_event(db, event)

            # Dispatch to specific handler if one exists
            handler = EVENT_HANDLERS.get(event["type"])
            if handler:
                await handler(db, event)

            # Link billing event to subscription if possible
            sub_id = event["data"]["object"].get("subscription") or event["data"]["object"].get("id")
            if sub_id:
                result = await db.execute(
                    select(Subscription).where(Subscription.stripe_subscription_id == sub_id)
                )
                sub = result.scalar_one_or_none()
                if sub:
                    billing_event.subscription_id = sub.id

            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("stripe_webhook_processing_error", event_id=event["id"])
            # Still return 200 so Stripe doesn't retry on our application errors
            # The event is not stored if we rollback, but that's acceptable
            # for transient errors; Stripe will retry.
            raise HTTPException(status_code=500, detail="Internal processing error")

    return {"status": "ok"}
