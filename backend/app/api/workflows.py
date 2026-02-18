"""Workflow management routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.engine import get_db
from backend.app.database.models import WorkflowRun, WorkflowStep, WorkflowStatus
from backend.app.core.workflow_engine import workflow_engine
from pydantic import BaseModel, Field
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def list_workflows(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(WorkflowRun).order_by(WorkflowRun.created_at.desc()).limit(50)
    if status:
        query = query.where(WorkflowRun.status == status)
    result = await db.execute(query)
    runs = result.scalars().all()

    out = []
    for r in runs:
        item: dict = {
            "id": r.id, "workflow_name": r.workflow_name,
            "status": r.status.value if r.status else "pending",
            "current_step_id": r.current_step_id, "trigger": r.trigger,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        # For approval-paused runs, include completed step outputs so the UI
        # can show WHAT the user is approving (outreach drafts, reviews, etc.)
        if r.status == WorkflowStatus.PAUSED_FOR_APPROVAL:
            steps_result = await db.execute(
                select(WorkflowStep).where(WorkflowStep.run_id == r.id).order_by(WorkflowStep.id)
            )
            item["steps"] = [
                {
                    "step_id": s.step_id, "agent_slug": s.agent_slug,
                    "action": s.action, "status": s.status.value if s.status else "pending",
                    "output_data": s.output_data,
                }
                for s in steps_result.scalars().all()
            ]
        out.append(item)
    return out


@router.get("/definitions")
async def workflow_definitions():
    """Return all workflow definitions with step details for the UI."""
    from backend.app.config import load_yaml_config
    config = load_yaml_config("workflows")
    agent_config = load_yaml_config("agents")
    agents_map = agent_config.get("agents", {})

    result = {}
    for key, wf in config.get("workflows", {}).items():
        steps = []
        for step in wf.get("steps", []):
            agent_slug = step.get("agent")
            agent_info = agents_map.get(agent_slug, {}) if agent_slug else {}
            steps.append({
                "id": step["id"],
                "agent": agent_slug,
                "agent_name": agent_info.get("name", agent_slug or "Human"),
                "model": agent_info.get("model", ""),
                "action": step.get("action", ""),
                "requires_approval": step.get("requires_human_approval", False),
                "next": step.get("next"),
                "description": _step_description(step),
            })
        result[key] = {
            "name": wf.get("name", key),
            "description": wf.get("description", ""),
            "schedule": wf.get("schedule"),
            "enabled": wf.get("enabled", True),
            "steps": steps,
        }
    return result


@router.get("/pending-approvals")
async def pending_approvals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkflowRun).where(WorkflowRun.status == WorkflowStatus.PAUSED_FOR_APPROVAL)
    )
    return [
        {
            "id": r.id, "workflow_name": r.workflow_name,
            "current_step_id": r.current_step_id,
            "started_at": r.started_at.isoformat() if r.started_at else None,
        }
        for r in result.scalars().all()
    ]


@router.get("/{run_id}")
async def get_workflow_run(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Workflow run not found")

    steps_result = await db.execute(
        select(WorkflowStep).where(WorkflowStep.run_id == run_id).order_by(WorkflowStep.id)
    )
    steps = steps_result.scalars().all()

    return {
        "id": run.id, "workflow_name": run.workflow_name,
        "status": run.status.value if run.status else "pending",
        "current_step_id": run.current_step_id,
        "context": run.context, "error_message": run.error_message,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "steps": [
            {
                "step_id": s.step_id, "agent_slug": s.agent_slug,
                "action": s.action, "status": s.status.value if s.status else "pending",
                "cost_usd": s.cost_usd, "duration_ms": s.duration_ms,
                "retry_count": s.retry_count,
                "output_data": s.output_data,
            }
            for s in steps
        ],
    }


def _step_description(step: dict) -> str:
    """Generate a human-readable description of what a step does."""
    action = step.get("action", "")
    descriptions = {
        "research_keywords": "Researches trending keywords and search opportunities for the target market",
        "score_and_approve": "Scores and prioritizes topics based on relevance, revenue potential, and trends",
        "write_content": "Writes content in the target language with SEO keywords and brand voice",
        "review_and_score": "Reviews content for accuracy, SEO, brand voice, and cultural fit (scores 1-10)",
        "format_and_publish": "Formats content for each platform and schedules at optimal posting times",
        "collect_metrics": "Collects engagement, traffic, and conversion metrics from all platforms",
        "audit_client_site": "Runs a technical and content SEO audit on the client's website",
        "find_opportunities": "Identifies keyword gaps and ranking opportunities vs competitors",
        "write_seo_content": "Writes SEO-optimized content targeting identified keyword opportunities",
        "review_seo_quality": "Reviews SEO content for keyword integration, readability, and accuracy",
        "deliver": "Delivers completed work to the client with a status update",
        "research_and_plan": "Researches target audience and plans ad campaign strategy",
        "approve_ad_budget": "Reviews and approves the proposed ad spend allocation",
        "create_ad_copy": "Creates multiple ad copy variations for A/B testing",
        "review_ad_copy": "Reviews ad copy for quality, compliance, and platform policy alignment",
        "await_human_approval": "Pauses for your review and approval before proceeding",
        "launch": "Launches the approved campaign on the target platforms",
        "track_ad_metrics": "Tracks CTR, CPC, ROAS, and conversion data for active campaigns",
        "design_campaign": "Designs email campaign with subject line, body, and CTA",
        "review_email": "Reviews email content for quality and compliance",
        "send": "Sends the approved email campaign to the target segment",
        "track_email_metrics": "Tracks open rates, click rates, and unsubscribes",
        "qualify_lead": "Evaluates and scores the lead based on fit criteria",
        "create_deliverable_schedule": "Creates a delivery timeline for the client's service package",
        "allocate_resources": "Assigns agents and sets resource allocation for the client",
        "approve_client_budget": "Reviews financial viability and approves the client budget",
        "collect_all_metrics": "Aggregates metrics from all channels into a unified dataset",
        "generate_report": "Generates a formatted performance report with charts and insights",
        "add_strategic_recommendations": "Adds strategic recommendations and next steps to the report",
        "deliver_report": "Sends the completed report to the client",
        "scout_local_businesses": "Scouts local mom & pop shops, restaurants, and salons needing digital services",
        "research_businesses": "Deep-dives on target businesses: online presence, competitors, digital gaps",
        "score_and_qualify": "Ranks and qualifies leads by fit, budget potential, and service urgency",
        "draft_outreach": "Writes personalized outreach messages in ES/EN for top-scored leads",
        "compliance_review": "Reviews outreach content for legal compliance and platform policies",
        "find_leads": "Identifies and scores potential prospects from available data sources",
        "strategic_assessment": "Evaluates portfolio health and identifies strategic priorities",
        "budget_report": "Reports current budget usage, burn rate, and forecast",
        "client_profitability": "Analyzes revenue vs cost per client for profitability insights",
        "delivery_status": "Checks all active deliverable deadlines and fulfillment status",
    }
    return descriptions.get(action, f"Executes: {action.replace('_', ' ')}")


class RunSingleStep(BaseModel):
    agent_slug: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-z0-9_]+$')
    action: str = Field(..., min_length=1, max_length=200)
    context: Optional[dict] = None


@router.post("/run-step")
async def run_single_step(body: RunSingleStep, db: AsyncSession = Depends(get_db)):
    """Execute a single agent action without a full pipeline. Saves tokens by running only what you need."""
    agent = workflow_engine._agents.get(body.agent_slug)
    if not agent:
        raise HTTPException(400, f"Agent '{body.agent_slug}' not registered or not available")

    from datetime import datetime, timezone
    try:
        result = await agent.think(
            prompt=f"Execute action: {body.action}",
            db=db,
            context=body.context or {},
        )

        # Auto-persist scout/research/qualify outputs to Lead records
        response_data = {
            "agent": body.agent_slug,
            "action": body.action,
            "response": result.get("content", ""),
            "parsed": result.get("parsed"),
            "cost_usd": result.get("cost_usd", 0),
            "duration_ms": result.get("duration_ms", 0),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if body.action in ("scout_local_businesses", "research_businesses", "score_and_qualify"):
            try:
                from backend.app.api.leads import _parse_and_create_leads
                parsed = result.get("parsed") or {}
                source = f"{body.agent_slug}:{body.action}"
                if isinstance(parsed, dict) and any(k in parsed for k in ("businesses", "leads", "prospects", "results", "scout_report")):
                    created = await _parse_and_create_leads(parsed, source, db)
                    response_data["leads_created"] = len(created)
            except Exception:
                logger.warning("Auto-persist to leads failed (non-fatal)", exc_info=True)

        return response_data
    except Exception as e:
        logger.exception("Step execution failed")
        raise HTTPException(500, "Step execution failed")


class TriggerWorkflow(BaseModel):
    workflow_name: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-z0-9_]+$')
    context: Optional[dict] = None


@router.post("/trigger")
async def trigger_workflow(body: TriggerWorkflow, db: AsyncSession = Depends(get_db)):
    try:
        run = await workflow_engine.start_workflow(body.workflow_name, db, body.context, trigger="manual")
        return {"run_id": run.id, "status": run.status.value}
    except ValueError as e:
        raise HTTPException(400, str(e))


class ApprovalAction(BaseModel):
    approved: bool = True


@router.post("/{run_id}/approve/{step_id}")
async def approve_workflow_step(run_id: int, step_id: str, body: ApprovalAction, db: AsyncSession = Depends(get_db)):
    try:
        await workflow_engine.approve_step(run_id, step_id, db, body.approved)
        return {"status": "approved" if body.approved else "rejected"}
    except ValueError as e:
        raise HTTPException(400, str(e))
