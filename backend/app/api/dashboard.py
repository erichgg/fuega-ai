"""Dashboard KPIs and activity feed."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from backend.app.database.engine import get_db
from backend.app.database.models import (
    Agent, AgentLog, AgentStatus, Client, ContentIdea, ContentDraft, ContentStatus,
    PublishedContent, WorkflowRun, WorkflowStatus, RevenueEvent,
)
from datetime import datetime, timedelta, timezone

router = APIRouter()


@router.get("/kpis")
async def get_kpis(db: AsyncSession = Depends(get_db)):
    """Main dashboard KPIs."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Agent stats
    agents_result = await db.execute(select(func.count(Agent.id)))
    total_agents = agents_result.scalar() or 0

    active_agents = await db.execute(
        select(func.count(Agent.id)).where(Agent.status == AgentStatus.ACTIVE)
    )
    active_count = active_agents.scalar() or 0

    # Client stats
    clients_result = await db.execute(
        select(func.count(Client.id)).where(Client.status == "active")
    )
    total_clients = clients_result.scalar() or 0

    # Revenue this month
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(RevenueEvent.amount_usd), 0.0))
        .where(RevenueEvent.created_at >= month_start)
    )
    monthly_revenue = revenue_result.scalar() or 0.0

    # Cost this month
    cost_result = await db.execute(
        select(func.coalesce(func.sum(AgentLog.cost_usd), 0.0))
        .where(AgentLog.created_at >= month_start)
    )
    monthly_cost = cost_result.scalar() or 0.0

    # Content stats
    published = await db.execute(
        select(func.count(PublishedContent.id))
        .where(PublishedContent.published_at >= month_start)
    )
    published_count = published.scalar() or 0

    drafts_in_progress = await db.execute(
        select(func.count(ContentDraft.id))
        .where(ContentDraft.status.in_([ContentStatus.WRITING, ContentStatus.REVIEW, ContentStatus.REVISION]))
    )
    drafts_count = drafts_in_progress.scalar() or 0

    ideas_count_result = await db.execute(
        select(func.count(ContentIdea.id))
        .where(ContentIdea.status == ContentStatus.IDEA)
    )
    ideas_count = ideas_count_result.scalar() or 0

    # Workflow stats
    active_workflows = await db.execute(
        select(func.count(WorkflowRun.id))
        .where(WorkflowRun.status.in_([WorkflowStatus.RUNNING, WorkflowStatus.PAUSED_FOR_APPROVAL]))
    )
    active_wf = active_workflows.scalar() or 0

    pending_approvals = await db.execute(
        select(func.count(WorkflowRun.id))
        .where(WorkflowRun.status == WorkflowStatus.PAUSED_FOR_APPROVAL)
    )
    approvals = pending_approvals.scalar() or 0

    return {
        "agents": {"total": total_agents, "active": active_count},
        "clients": {"total": total_clients},
        "revenue": {"monthly_usd": round(monthly_revenue, 2)},
        "costs": {"monthly_usd": round(monthly_cost, 6)},
        "profit": {"monthly_usd": round(monthly_revenue - monthly_cost, 2)},
        "content": {
            "ideas": ideas_count,
            "in_progress": drafts_count,
            "published_this_month": published_count,
        },
        "workflows": {"active": active_wf, "pending_approvals": approvals},
    }


@router.get("/activity")
async def get_activity(limit: int = Query(default=20, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    """Recent activity feed."""
    result = await db.execute(
        select(AgentLog)
        .order_by(AgentLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "agent_id": log.agent_id,
            "action": log.action,
            "input_summary": log.input_summary,
            "output_summary": log.output_summary,
            "cost_usd": log.cost_usd,
            "duration_ms": log.duration_ms,
            "success": log.success,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


@router.get("/cost-chart")
async def get_cost_chart(days: int = Query(default=30, ge=1, le=365), db: AsyncSession = Depends(get_db)):
    """Daily cost data for charting."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(AgentLog.created_at).label("date"),
            func.sum(AgentLog.cost_usd).label("cost"),
            func.count(AgentLog.id).label("calls")
        )
        .where(AgentLog.created_at >= since)
        .group_by(func.date(AgentLog.created_at))
        .order_by(func.date(AgentLog.created_at))
    )
    rows = result.all()
    return {
        "labels": [str(r.date) for r in rows],
        "costs": [round(float(r.cost or 0), 4) for r in rows],
        "calls": [int(r.calls or 0) for r in rows],
    }


@router.get("/revenue-chart")
async def get_revenue_chart(months: int = 6, db: AsyncSession = Depends(get_db)):
    """Monthly revenue data for charting. Uses extract() for cross-DB compatibility."""
    result = await db.execute(
        select(
            extract("year", RevenueEvent.created_at).label("year"),
            extract("month", RevenueEvent.created_at).label("month"),
            func.sum(RevenueEvent.amount_usd).label("revenue"),
        )
        .group_by(
            extract("year", RevenueEvent.created_at),
            extract("month", RevenueEvent.created_at),
        )
        .order_by(
            extract("year", RevenueEvent.created_at).desc(),
            extract("month", RevenueEvent.created_at).desc(),
        )
        .limit(months)
    )
    rows = list(reversed(result.all()))
    return {
        "labels": [f"{int(r.year)}-{int(r.month):02d}" for r in rows],
        "revenue": [round(float(r.revenue or 0), 2) for r in rows],
    }
