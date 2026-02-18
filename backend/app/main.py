"""Fuega AI - FastAPI Application."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from backend.app.config import get_settings
from backend.app.database.engine import engine as db_engine, AsyncSessionLocal
from backend.app.database.models import Base, AuditLog
from backend.app.database.seed import run_seeds
from backend.app.agents.all_agents import create_all_agents
from backend.app.core.workflow_engine import workflow_engine
from backend.app.core.scheduler import WorkflowScheduler
from backend.app.logging_config import setup_logging
from backend.app.api import dashboard, agents, content, clients, leads, seo, campaigns, workflows, analytics, settings as settings_router, websocket, integrations, billing, stripe_webhook, outreach, approvals
from backend.app.api import auth as auth_router
import structlog

logger = structlog.get_logger()

# ── Rate limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging(get_settings().log_level)
    logger.info("starting_fuega_ai")

    # Create tables (safe for existing DBs — won't overwrite).
    # For new schema changes, use Alembic migrations:
    #   python -m alembic revision --autogenerate -m "description"
    #   python -m alembic upgrade head
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

    # Create media directories (use /app/data which is writable in Docker)
    from pathlib import Path
    media_root = Path("/app/data/media") if get_settings().environment == "production" else Path(__file__).parent.parent / "media"
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

# ── Rate limiting ────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security headers middleware ──────────────────────────────────────────────

settings = get_settings()


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


# ── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
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
app.include_router(outreach.router, prefix="/api/outreach", tags=["Outreach"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(stripe_webhook.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["Approvals"])


# ── Audit logging utility ────────────────────────────────────────────────────


async def log_audit(
    db,
    action: str,
    user_id: int | None = None,
    resource: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """Utility function for writing audit log entries from anywhere in the app."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.commit()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "fuega-ai"}
