"""Analytics and cost tracking routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.engine import get_db
from backend.app.database.models import Agent, RevenueEvent
from backend.app.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/costs")
async def cost_breakdown(db: AsyncSession = Depends(get_db)):
    """Cost breakdown by agent."""
    result = await db.execute(
        select(
            Agent.slug,
            Agent.name,
            Agent.monthly_budget_usd,
            Agent.month_spend_usd,
            Agent.total_calls,
        ).order_by(Agent.month_spend_usd.desc())
    )
    rows = result.all()
    return {
        "agents": [
            {
                "slug": r.slug, "name": r.name,
                "budget": r.monthly_budget_usd,
                "spent": round(r.month_spend_usd or 0, 4),
                "calls": r.total_calls,
                "usage_pct": round(((r.month_spend_usd or 0) / r.monthly_budget_usd * 100) if r.monthly_budget_usd else 0, 1),
            }
            for r in rows
        ],
        "total_budget": sum(r.monthly_budget_usd or 0 for r in rows),
        "total_spent": round(sum(r.month_spend_usd or 0 for r in rows), 4),
    }


@router.get("/performance")
async def performance_overview(db: AsyncSession = Depends(get_db)):
    """Content and campaign performance metrics."""
    # Agent efficiency
    result = await db.execute(
        select(
            Agent.slug,
            Agent.name,
            Agent.total_calls,
            Agent.month_spend_usd,
            Agent.success_rate,
        ).order_by(Agent.total_calls.desc())
    )
    agents = result.all()

    return {
        "agent_efficiency": [
            {
                "slug": a.slug, "name": a.name,
                "calls": a.total_calls,
                "cost": round(a.month_spend_usd or 0, 4),
                "success_rate": a.success_rate,
                "cost_per_call": round(((a.month_spend_usd or 0) / a.total_calls) if a.total_calls else 0, 6),
            }
            for a in agents
        ],
    }


@router.get("/revenue")
async def revenue_data(db: AsyncSession = Depends(get_db)):
    """Revenue tracking data."""
    result = await db.execute(
        select(RevenueEvent).order_by(RevenueEvent.created_at.desc()).limit(100)
    )
    events = result.scalars().all()

    total = sum(e.amount_usd or 0 for e in events)

    return {
        "total_usd": round(total, 2),
        "events": [
            {
                "id": e.id, "client_id": e.client_id,
                "amount_usd": e.amount_usd, "description": e.description,
                "event_type": e.event_type,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    }
