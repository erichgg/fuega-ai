"""Seed the database with initial agent data from config."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.models import Agent, AgentStatus, BudgetTracking
from backend.app.config import load_yaml_config
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


async def seed_agents(db: AsyncSession):
    """Create agent records from agents.yaml config."""
    config = load_yaml_config("agents")
    if not config or "agents" not in config:
        return

    for slug, agent_cfg in config["agents"].items():
        existing = await db.execute(select(Agent).where(Agent.slug == slug))
        if existing.scalar_one_or_none():
            continue

        agent = Agent(
            slug=slug,
            name=agent_cfg["name"],
            role=agent_cfg["role"],
            description=agent_cfg.get("description", ""),
            model=agent_cfg["model"],
            monthly_budget_usd=agent_cfg.get("monthly_budget_usd", 0),
            status=AgentStatus.PAUSED,
        )
        db.add(agent)

    await db.commit()


async def seed_initial_budget(db: AsyncSession):
    """Create initial budget tracking records."""
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    existing = await db.execute(
        select(BudgetTracking).where(BudgetTracking.month == month)
    )
    if existing.scalars().first():
        return

    budget_config = load_yaml_config("budget")
    if not budget_config:
        return

    categories = {
        "fixed_costs": budget_config.get("budget", {}).get("monthly_fixed_costs", {}).get("total_fixed", 227),
        "agent_api_calls": budget_config.get("budget", {}).get("agent_budgets", {}).get("total_agent_budget", 86),
    }

    for cat, amount in categories.items():
        record = BudgetTracking(
            month=month, category=cat, budgeted_usd=amount, actual_usd=0.0
        )
        db.add(record)

    await db.commit()


async def run_seeds(db: AsyncSession):
    try:
        await seed_agents(db)
    except Exception as e:
        logger.error("Failed to seed agents: %s", e)
    try:
        await seed_initial_budget(db)
    except Exception as e:
        logger.error("Failed to seed initial budget: %s", e)
