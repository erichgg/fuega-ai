"""Fuega AI - FastAPI Application."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import get_settings
from backend.app.database.engine import engine as db_engine, AsyncSessionLocal
from backend.app.database.models import Base
from backend.app.database.seed import run_seeds
from backend.app.agents.all_agents import create_all_agents
from backend.app.core.workflow_engine import workflow_engine
from backend.app.core.scheduler import WorkflowScheduler
from backend.app.logging_config import setup_logging
from backend.app.api import dashboard, agents, content, clients, leads, seo, campaigns, workflows, analytics, settings as settings_router, websocket, integrations
import structlog

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging(get_settings().log_level)
    logger.info("starting_fuega_ai")

    # Create tables
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed data
    async with AsyncSessionLocal() as db:
        await run_seeds(db)

    # Register agents with workflow engine
    agents_map = create_all_agents()
    for slug, agent in agents_map.items():
        workflow_engine.register_agent(slug, agent)
    app.state.agents = agents_map

    # Start scheduler
    scheduler = WorkflowScheduler()
    scheduler.start()
    app.state.scheduler = scheduler

    # Create media directories
    from pathlib import Path
    media_root = Path(__file__).parent.parent / "media"
    (media_root / "audio").mkdir(parents=True, exist_ok=True)
    (media_root / "images").mkdir(parents=True, exist_ok=True)

    logger.info("fuega_ai_ready", agents=len(agents_map))
    yield

    # Shutdown
    scheduler.shutdown()
    await db_engine.dispose()
    logger.info("fuega_ai_stopped")


app = FastAPI(
    title="Fuega AI API",
    description="AI-powered full-service digital agency for LATAM small businesses",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
app.include_router(seo.router, prefix="/api/seo", tags=["SEO"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])
app.include_router(websocket.router, tags=["WebSocket"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "fuega-ai"}
