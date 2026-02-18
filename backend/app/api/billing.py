"""Billing endpoints — Stripe checkout, portal, subscription status, and usage."""
from datetime import datetime, timezone
from typing import Optional

import stripe
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth import get_current_user
from backend.app.config import get_settings
from backend.app.database.engine import get_db
from backend.app.database.models import (
    Agent,
    AgentLog,
    Subscription,
    SubscriptionStatus,
    User,
)

logger = structlog.get_logger()

router = APIRouter(dependencies=[Depends(get_current_user)])

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class CheckoutRequest(BaseModel):
    plan: str
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    url: str


class PortalResponse(BaseModel):
    url: str


class UsageByAgent(BaseModel):
    agent_slug: str
    agent_name: str
    api_calls: int
    tokens: int
    cost_usd: float


class SubscriptionStatusResponse(BaseModel):
    plan: Optional[str] = None
    status: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    usage: dict = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PLAN_TO_PRICE_SETTING = {
    "fuega_starter": "stripe_starter_price_id",
    "fuega_growth": "stripe_growth_price_id",
    "fuega_pro": "stripe_pro_price_id",
    "fuega_enterprise": "stripe_enterprise_price_id",
    # Short aliases used by the frontend
    "starter": "stripe_starter_price_id",
    "growth": "stripe_growth_price_id",
    "pro": "stripe_pro_price_id",
    "enterprise": "stripe_enterprise_price_id",
}


def _configure_stripe() -> None:
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key


async def _get_or_create_customer(user: User) -> str:
    """Return existing Stripe customer ID or create a new one."""
    _configure_stripe()
    # Check if user already has a subscription with a Stripe customer
    # (We don't store stripe_customer_id on User directly; it lives on Subscription)
    # For new checkout, search Stripe by email.
    try:
        customers = stripe.Customer.list(email=user.email, limit=1)
        if customers.data:
            return customers.data[0].id
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name or user.email,
            metadata={"fuega_user_id": str(user.id)},
        )
        return customer.id
    except stripe.StripeError as e:
        logger.error("stripe_customer_error", error=str(e))
        raise HTTPException(status_code=502, detail="Failed to create Stripe customer")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for a given plan."""
    _configure_stripe()
    settings = get_settings()

    price_attr = PLAN_TO_PRICE_SETTING.get(body.plan)
    if not price_attr:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")

    price_id = getattr(settings, price_attr, "")
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Stripe price not configured for plan: {body.plan}")

    customer_id = await _get_or_create_customer(current_user)

    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            metadata={
                "fuega_user_id": str(current_user.id),
                "fuega_plan": body.plan,
            },
        )
        return CheckoutResponse(url=session.url)
    except stripe.StripeError as e:
        logger.error("stripe_checkout_error", error=str(e))
        raise HTTPException(status_code=502, detail="Failed to create checkout session")


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session so the user can manage their subscription."""
    _configure_stripe()

    # Find the user's subscription to get customer ID
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id).order_by(Subscription.created_at.desc())
    )
    subscription = result.scalar_one_or_none()
    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
        )
        return PortalResponse(url=portal_session.url)
    except stripe.StripeError as e:
        logger.error("stripe_portal_error", error=str(e))
        raise HTTPException(status_code=502, detail="Failed to create billing portal session")


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current subscription status and high-level usage for the billing period."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id).order_by(Subscription.created_at.desc())
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        return SubscriptionStatusResponse()

    # Aggregate usage from AgentLog within the current billing period
    period_start = subscription.current_period_start or subscription.created_at
    usage_result = await db.execute(
        select(
            func.count(AgentLog.id).label("api_calls"),
            func.coalesce(func.sum(AgentLog.input_tokens + AgentLog.output_tokens), 0).label("tokens"),
            func.coalesce(func.sum(AgentLog.cost_usd), 0).label("estimated_cost"),
        ).where(AgentLog.created_at >= period_start)
    )
    row = usage_result.one()

    return SubscriptionStatusResponse(
        plan=subscription.plan,
        status=subscription.status.value if subscription.status else None,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        usage={
            "api_calls": row.api_calls,
            "tokens": int(row.tokens),
            "estimated_cost": round(float(row.estimated_cost), 4),
        },
    )


@router.get("/usage")
async def get_usage_breakdown(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return usage summary with per-agent cost breakdown for the current billing period."""
    # Determine billing period start
    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id).order_by(Subscription.created_at.desc())
    )
    subscription = sub_result.scalar_one_or_none()
    period_start = (
        subscription.current_period_start
        if subscription and subscription.current_period_start
        else datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    )

    # Per-agent breakdown
    rows = await db.execute(
        select(
            Agent.slug,
            Agent.name,
            func.count(AgentLog.id).label("api_calls"),
            func.coalesce(func.sum(AgentLog.input_tokens + AgentLog.output_tokens), 0).label("tokens"),
            func.coalesce(func.sum(AgentLog.cost_usd), 0).label("cost_usd"),
        )
        .join(Agent, Agent.id == AgentLog.agent_id)
        .where(AgentLog.created_at >= period_start)
        .group_by(Agent.slug, Agent.name)
        .order_by(func.sum(AgentLog.cost_usd).desc())
    )
    per_agent = [
        {
            "agent": r.slug,
            "calls": r.api_calls,
            "tokens": int(r.tokens),
            "cost": round(float(r.cost_usd), 4),
        }
        for r in rows.all()
    ]

    # Totals
    total_calls = sum(a["calls"] for a in per_agent)
    total_tokens = sum(a["tokens"] for a in per_agent)
    estimated_cost = sum(a["cost"] for a in per_agent)

    # Daily cost breakdown for chart (last 30 days)
    from sqlalchemy import cast, Date
    daily_rows = await db.execute(
        select(
            cast(AgentLog.created_at, Date).label("day"),
            func.coalesce(func.sum(AgentLog.cost_usd), 0).label("cost"),
        )
        .where(AgentLog.created_at >= period_start)
        .group_by(cast(AgentLog.created_at, Date))
        .order_by(cast(AgentLog.created_at, Date))
    )
    daily = daily_rows.all()
    daily_costs = {
        "labels": [str(r.day) for r in daily],
        "values": [round(float(r.cost), 4) for r in daily],
    }

    return {
        "total_api_calls": total_calls,
        "total_tokens": total_tokens,
        "estimated_cost_usd": round(estimated_cost, 4),
        "per_agent": per_agent,
        "daily_costs": daily_costs,
    }
