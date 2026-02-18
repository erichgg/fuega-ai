"""Agent management routes."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.engine import get_db
from backend.app.database.models import (
    Agent, AgentLog, AgentMemory, AgentStatus,
    AgentActionConfig, HITLMode,
)
from backend.app.config import load_yaml_config
from backend.app.auth import get_current_user
from backend.app.database.models import User
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(dependencies=[Depends(get_current_user)])

DEFAULT_ACTIONS = [
    "send_email", "post_tweet", "search_web", "generate_content",
    "make_api_call", "update_lead", "create_content", "run_analysis",
]


def _get_agent_yaml_config(slug: str) -> dict:
    """Load agent config from agents.yaml by slug."""
    data = load_yaml_config("agents")
    agents_map = data.get("agents", {})
    return agents_map.get(slug, {})


@router.get("/")
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).order_by(Agent.id))
    agents = result.scalars().all()
    return [
        {
            "id": a.id,
            "slug": a.slug,
            "name": a.name,
            "role": a.role,
            "description": a.description or "",
            "model": a.model,
            "status": a.status.value if a.status else "active",
            "monthly_budget_usd": a.monthly_budget_usd,
            "month_spend_usd": round(a.month_spend_usd or 0, 4),
            "budget_usage_pct": round(((a.month_spend_usd or 0) / a.monthly_budget_usd * 100) if a.monthly_budget_usd else 0, 1),
            "total_calls": a.total_calls,
            "total_tokens": a.total_tokens,
            "success_rate": a.success_rate,
        }
        for a in agents
    ]


class TeamChatRequest(BaseModel):
    slugs: list[str] = Field(..., min_length=1)
    message: str = Field(..., min_length=1, max_length=10000)


@router.post("/team-chat")
async def team_chat(body: TeamChatRequest, request: Request, db: AsyncSession = Depends(get_db)):
    agents_map = request.app.state.agents
    responses = []
    conversation_context = f"User message: {body.message}"

    for slug in body.slugs:
        agent = agents_map.get(slug)
        if not agent:
            responses.append({"slug": slug, "name": slug, "response": "Agent not found", "error": True})
            continue

        # Check if budget exceeded
        agent_record = await db.execute(select(Agent).where(Agent.slug == slug))
        record = agent_record.scalar_one_or_none()
        if record and record.status == AgentStatus.BUDGET_EXCEEDED:
            responses.append({
                "slug": slug,
                "name": record.name,
                "response": "Budget exceeded — skipped",
                "error": True,
            })
            continue

        # Build context with prior responses
        prompt = conversation_context
        if responses:
            prior = "\n\n".join(
                f"{r['name']} ({r['slug']}): {r['response']}"
                for r in responses if not r.get("error")
            )
            prompt = f"{conversation_context}\n\nPrior agent responses:\n{prior}"

        result = await agent.think(prompt=prompt, db=db)
        responses.append({
            "slug": slug,
            "name": agent.name,
            "response": result.get("content", ""),
            "cost_usd": result.get("cost_usd", 0),
        })

    return responses


class AgentImportBody(BaseModel):
    slug: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    model: str = Field(default="claude-haiku-4-5-20251001")
    description: Optional[str] = None
    monthly_budget_usd: Optional[float] = None
    action_configs: Optional[list[dict]] = None


@router.post("/import")
async def import_agent(
    body: AgentImportBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Import agent config from JSON. Creates or updates agent record and action configs."""
    result = await db.execute(select(Agent).where(Agent.slug == body.slug))
    agent = result.scalar_one_or_none()

    if agent:
        agent.name = body.name
        agent.role = body.role
        agent.model = body.model
        if body.description is not None:
            agent.description = body.description
        if body.monthly_budget_usd is not None:
            agent.monthly_budget_usd = body.monthly_budget_usd
    else:
        agent = Agent(
            slug=body.slug,
            name=body.name,
            role=body.role,
            model=body.model,
            description=body.description or "",
            monthly_budget_usd=body.monthly_budget_usd or 0.0,
        )
        db.add(agent)

    # Import action configs if provided
    if body.action_configs:
        for ac in body.action_configs:
            action_name = ac.get("action_name")
            mode_str = ac.get("mode", "approve")
            if not action_name:
                continue
            try:
                mode = HITLMode(mode_str)
            except ValueError:
                mode = HITLMode.APPROVE

            existing = await db.execute(
                select(AgentActionConfig).where(
                    AgentActionConfig.agent_slug == body.slug,
                    AgentActionConfig.action_name == action_name,
                )
            )
            config = existing.scalar_one_or_none()
            if config:
                config.mode = mode
                config.updated_by = user.id
            else:
                db.add(AgentActionConfig(
                    agent_slug=body.slug,
                    action_name=action_name,
                    mode=mode,
                    updated_by=user.id,
                ))

    await db.commit()
    await db.refresh(agent)

    return {
        "id": agent.id,
        "slug": agent.slug,
        "name": agent.name,
        "role": agent.role,
        "model": agent.model,
        "imported": True,
    }


class AgentUpdate(BaseModel):
    status: Optional[str] = None
    monthly_budget_usd: Optional[float] = None


@router.patch("/{slug}")
async def update_agent(slug: str, body: AgentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.slug == slug))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, "Agent not found")

    if body.status is not None:
        if body.status not in ("active", "paused"):
            raise HTTPException(400, "Status must be 'active' or 'paused'")
        agent.status = AgentStatus(body.status)

    if body.monthly_budget_usd is not None:
        if body.monthly_budget_usd < 0:
            raise HTTPException(400, "Budget must be non-negative")
        agent.monthly_budget_usd = body.monthly_budget_usd

    await db.commit()
    await db.refresh(agent)

    return {
        "id": agent.id,
        "slug": agent.slug,
        "name": agent.name,
        "role": agent.role,
        "description": agent.description or "",
        "model": agent.model,
        "status": agent.status.value if agent.status else "active",
        "monthly_budget_usd": agent.monthly_budget_usd,
        "month_spend_usd": round(agent.month_spend_usd or 0, 4),
        "budget_usage_pct": round(((agent.month_spend_usd or 0) / agent.monthly_budget_usd * 100) if agent.monthly_budget_usd else 0, 1),
        "total_calls": agent.total_calls,
        "total_tokens": agent.total_tokens,
        "success_rate": agent.success_rate,
    }


@router.get("/{slug}")
async def get_agent(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.slug == slug))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, "Agent not found")
    yaml_config = _get_agent_yaml_config(slug)
    return {
        "id": agent.id,
        "slug": agent.slug,
        "name": agent.name,
        "role": agent.role,
        "description": agent.description,
        "model": agent.model,
        "status": agent.status.value if agent.status else "active",
        "monthly_budget_usd": agent.monthly_budget_usd,
        "month_spend_usd": round(agent.month_spend_usd or 0, 4),
        "total_calls": agent.total_calls,
        "total_tokens": agent.total_tokens,
        "success_rate": agent.success_rate,
        "inputs": yaml_config.get("inputs", []),
        "outputs": yaml_config.get("outputs", []),
        "tools": yaml_config.get("tools", []),
        "system_prompt": yaml_config.get("system_prompt", ""),
    }


@router.get("/{slug}/logs")
async def get_agent_logs(slug: str, limit: int = Query(default=50, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    agent_result = await db.execute(select(Agent).where(Agent.slug == slug))
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, "Agent not found")

    result = await db.execute(
        select(AgentLog).where(AgentLog.agent_id == agent.id)
        .order_by(AgentLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log_entry.id,
            "action": log_entry.action,
            "input_summary": log_entry.input_summary,
            "output_summary": log_entry.output_summary,
            "cost_usd": log_entry.cost_usd,
            "duration_ms": log_entry.duration_ms,
            "success": log_entry.success,
            "created_at": log_entry.created_at.isoformat() if log_entry.created_at else None,
        }
        for log_entry in logs
    ]


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)


@router.post("/{slug}/chat")
async def chat_with_agent(slug: str, body: ChatMessage, request: Request, db: AsyncSession = Depends(get_db)):
    agents_map = request.app.state.agents
    agent = agents_map.get(slug)
    if not agent:
        raise HTTPException(404, "Agent not found")

    result = await agent.think(prompt=body.message, db=db)
    return {
        "response": result.get("content", ""),
        "parsed": result.get("parsed"),
        "cost_usd": result.get("cost_usd", 0),
        "tokens": result.get("input_tokens", 0) + result.get("output_tokens", 0),
    }


# ── Agent Action Config (HITL) ─────────────────────────────────────────────


@router.get("/{slug}/actions")
async def list_agent_actions(slug: str, db: AsyncSession = Depends(get_db)):
    """List all action configs for an agent. Returns defaults if none configured."""
    result = await db.execute(
        select(AgentActionConfig).where(AgentActionConfig.agent_slug == slug)
        .order_by(AgentActionConfig.action_name)
    )
    configs = result.scalars().all()

    if configs:
        return [
            {
                "action_name": c.action_name,
                "mode": c.mode.value if c.mode else "approve",
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in configs
        ]

    # No configs exist yet -- return defaults with APPROVE mode
    return [
        {"action_name": action, "mode": "approve", "updated_at": None}
        for action in DEFAULT_ACTIONS
    ]


class ActionModeUpdate(BaseModel):
    mode: str = Field(..., pattern=r'^(auto|approve|manual)$')


@router.put("/{slug}/actions/{action_name}")
async def update_action_mode(
    slug: str,
    action_name: str,
    body: ActionModeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update the HITL mode for a single agent action."""
    mode = HITLMode(body.mode)

    result = await db.execute(
        select(AgentActionConfig).where(
            AgentActionConfig.agent_slug == slug,
            AgentActionConfig.action_name == action_name,
        )
    )
    config = result.scalar_one_or_none()

    if config:
        config.mode = mode
        config.updated_by = user.id
    else:
        config = AgentActionConfig(
            agent_slug=slug,
            action_name=action_name,
            mode=mode,
            updated_by=user.id,
        )
        db.add(config)

    await db.commit()
    return {"action_name": action_name, "mode": mode.value, "updated": True}


class BulkActionUpdate(BaseModel):
    actions: list[dict] = Field(..., min_length=1)


@router.put("/{slug}/actions")
async def bulk_update_actions(
    slug: str,
    body: BulkActionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Bulk update HITL modes for multiple agent actions."""
    updated = []
    for item in body.actions:
        action_name = item.get("action_name")
        mode_str = item.get("mode")
        if not action_name or not mode_str:
            continue
        try:
            mode = HITLMode(mode_str)
        except ValueError:
            continue

        result = await db.execute(
            select(AgentActionConfig).where(
                AgentActionConfig.agent_slug == slug,
                AgentActionConfig.action_name == action_name,
            )
        )
        config = result.scalar_one_or_none()

        if config:
            config.mode = mode
            config.updated_by = user.id
        else:
            config = AgentActionConfig(
                agent_slug=slug,
                action_name=action_name,
                mode=mode,
                updated_by=user.id,
            )
            db.add(config)
        updated.append(action_name)

    await db.commit()
    return {"updated": updated, "count": len(updated)}


# ── Agent Export ────────────────────────────────────────────────────────────


@router.get("/{slug}/export")
async def export_agent(slug: str, db: AsyncSession = Depends(get_db)):
    """Export full agent config as JSON."""
    result = await db.execute(select(Agent).where(Agent.slug == slug))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, "Agent not found")

    yaml_config = _get_agent_yaml_config(slug)

    # Get action configs
    actions_result = await db.execute(
        select(AgentActionConfig).where(AgentActionConfig.agent_slug == slug)
    )
    action_configs = actions_result.scalars().all()

    # Get memory entries
    memories_result = await db.execute(
        select(AgentMemory).where(AgentMemory.agent_id == agent.id)
        .order_by(AgentMemory.confidence.desc()).limit(100)
    )
    memories = memories_result.scalars().all()

    return {
        "slug": agent.slug,
        "name": agent.name,
        "role": agent.role,
        "description": agent.description or "",
        "model": agent.model,
        "monthly_budget_usd": agent.monthly_budget_usd,
        "system_prompt": yaml_config.get("system_prompt", ""),
        "inputs": yaml_config.get("inputs", []),
        "outputs": yaml_config.get("outputs", []),
        "tools": yaml_config.get("tools", []),
        "action_configs": [
            {
                "action_name": c.action_name,
                "mode": c.mode.value if c.mode else "approve",
            }
            for c in action_configs
        ],
        "memories": [
            {
                "category": m.category,
                "key": m.key,
                "value": m.value,
                "confidence": m.confidence,
            }
            for m in memories
        ],
    }
