"""Lead management routes — full pipeline from prospect to close."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.database.engine import get_db
from backend.app.database.models import Lead, LeadStage, Client
from backend.app.core.workflow_engine import workflow_engine
from backend.app.auth import get_current_user
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_user)])

LEAD_STAGES = [s.value for s in LeadStage]


def _lead_to_dict(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "business_name": lead.business_name,
        "contact_name": lead.contact_name,
        "email": lead.email,
        "phone": lead.phone,
        "website_url": lead.website_url,
        "industry": lead.industry,
        "location": lead.location,
        "country": lead.country,
        "language": lead.language,
        "stage": lead.stage.value if lead.stage else "prospect",
        "score": lead.score,
        "source": lead.source,
        "digital_gap_score": lead.digital_gap_score,
        "google_rating": lead.google_rating,
        "review_count": lead.review_count,
        "has_website": lead.has_website,
        "has_social": lead.has_social,
        "outreach_draft": lead.outreach_draft,
        "outreach_channel": lead.outreach_channel,
        "recommended_service_tier": lead.recommended_service_tier,
        "agent_research": lead.agent_research,
        "followup_count": lead.followup_count or 0,
        "last_followup_at": lead.last_followup_at.isoformat() if lead.last_followup_at else None,
        "notes": lead.notes,
        "assigned_agent": lead.assigned_agent,
        "client_id": lead.client_id,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }


@router.get("/")
async def list_leads(stage: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Lead).order_by(Lead.created_at.desc())
    if stage and stage in LEAD_STAGES:
        query = query.where(Lead.stage == stage)
    result = await db.execute(query)
    return [_lead_to_dict(lead) for lead in result.scalars().all()]


@router.get("/kanban")
async def kanban_leads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).order_by(Lead.score.desc()))
    leads = result.scalars().all()
    kanban: dict[str, list] = {s: [] for s in LEAD_STAGES}
    for lead in leads:
        stage_key = lead.stage.value if lead.stage else "prospect"
        kanban[stage_key].append(_lead_to_dict(lead))
    counts = {s: len(items) for s, items in kanban.items()}
    return {"stages": kanban, "counts": counts, "total": len(leads)}


@router.get("/{lead_id}")
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return _lead_to_dict(lead)


class LeadCreate(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    website_url: Optional[str] = Field(None, max_length=500)
    industry: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    country: str = Field("MX", max_length=50)
    language: str = Field("es", max_length=10)
    stage: Optional[str] = "prospect"
    score: int = Field(0, ge=0, le=100)
    source: Optional[str] = Field(None, max_length=200)
    digital_gap_score: Optional[float] = None
    google_rating: Optional[float] = None
    review_count: Optional[int] = None
    has_website: Optional[bool] = None
    has_social: Optional[bool] = None
    outreach_draft: Optional[str] = None
    outreach_channel: Optional[str] = None
    recommended_service_tier: Optional[str] = None
    agent_research: Optional[dict] = None
    notes: Optional[str] = None
    assigned_agent: Optional[str] = None


@router.post("/")
async def create_lead(body: LeadCreate, db: AsyncSession = Depends(get_db)):
    data = body.model_dump()
    stage_str = data.pop("stage", "prospect")
    lead = Lead(**data, stage=LeadStage(stage_str) if stage_str in LEAD_STAGES else LeadStage.PROSPECT)
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return _lead_to_dict(lead)


class LeadUpdate(BaseModel):
    business_name: Optional[str] = Field(None, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=200)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    website_url: Optional[str] = Field(None, max_length=500)
    industry: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    country: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    stage: Optional[str] = None
    score: Optional[int] = Field(None, ge=0, le=100)
    source: Optional[str] = Field(None, max_length=200)
    digital_gap_score: Optional[float] = None
    google_rating: Optional[float] = None
    review_count: Optional[int] = None
    has_website: Optional[bool] = None
    has_social: Optional[bool] = None
    outreach_draft: Optional[str] = None
    outreach_channel: Optional[str] = None
    recommended_service_tier: Optional[str] = None
    agent_research: Optional[dict] = None
    notes: Optional[str] = None
    assigned_agent: Optional[str] = None


@router.patch("/{lead_id}")
async def update_lead(lead_id: int, body: LeadUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    updates = body.model_dump(exclude_unset=True)
    if "stage" in updates:
        stage_val = updates.pop("stage")
        if stage_val in LEAD_STAGES:
            lead.stage = LeadStage(stage_val)
    for key, val in updates.items():
        setattr(lead, key, val)

    await db.commit()
    await db.refresh(lead)
    return _lead_to_dict(lead)


@router.post("/{lead_id}/convert")
async def convert_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Convert a lead to a Client record and mark lead as won."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    client = Client(
        name=lead.contact_name or lead.business_name,
        business_name=lead.business_name,
        business_type=lead.industry,
        country=lead.country or "MX",
        language=lead.language or "es",
        email=lead.email,
        phone=lead.phone,
        plan_tier=lead.recommended_service_tier,
        website_url=lead.website_url,
        status="active",
        start_date=datetime.now(timezone.utc),
    )
    db.add(client)
    lead.stage = LeadStage.WON
    await db.commit()
    await db.refresh(client)
    lead.client_id = client.id
    await db.commit()
    await db.refresh(lead)

    return {"lead": _lead_to_dict(lead), "client_id": client.id}


class AgentOutputImport(BaseModel):
    agent_output: dict
    source: str = Field("agent", max_length=200)


@router.post("/from-agent-output")
async def from_agent_output(body: AgentOutputImport, db: AsyncSession = Depends(get_db)):
    """Parse agent JSON output and bulk-create leads."""
    created = await _parse_and_create_leads(body.agent_output, body.source, db)
    return {"created": len(created), "leads": created}


class RunAgentOnLead(BaseModel):
    agent_slug: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-z0-9_]+$')
    action: str = Field(..., min_length=1, max_length=200)


@router.post("/{lead_id}/run-agent")
async def run_agent_on_lead(lead_id: int, body: RunAgentOnLead, db: AsyncSession = Depends(get_db)):
    """Run a specific agent action with this lead's data as context."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    agent = workflow_engine._agents.get(body.agent_slug)
    if not agent:
        raise HTTPException(400, f"Agent '{body.agent_slug}' not registered")

    context = {
        "lead_id": lead.id,
        "business_name": lead.business_name,
        "contact_name": lead.contact_name,
        "email": lead.email,
        "phone": lead.phone,
        "website_url": lead.website_url,
        "industry": lead.industry,
        "location": lead.location,
        "country": lead.country,
        "language": lead.language,
        "score": lead.score,
        "google_rating": lead.google_rating,
        "review_count": lead.review_count,
        "has_website": lead.has_website,
        "has_social": lead.has_social,
        "agent_research": lead.agent_research,
    }

    try:
        agent_result = await agent.think(
            prompt=f"Execute action: {body.action}",
            db=db,
            context=context,
        )

        # Auto-update lead based on action type
        parsed = agent_result.get("parsed") or {}
        content = agent_result.get("content", "")

        if body.action == "research_businesses":
            lead.agent_research = parsed if parsed else {"raw": content}
            lead.stage = LeadStage.RESEARCHED
        elif body.action == "score_and_qualify":
            if isinstance(parsed, dict):
                lead.score = parsed.get("score", lead.score)
                lead.recommended_service_tier = parsed.get("recommended_tier", lead.recommended_service_tier)
            lead.stage = LeadStage.QUALIFIED
        elif body.action == "draft_outreach":
            lead.outreach_draft = parsed.get("draft", content) if isinstance(parsed, dict) else content
            lead.outreach_channel = parsed.get("channel", "email") if isinstance(parsed, dict) else "email"
            lead.stage = LeadStage.OUTREACH_DRAFTED

        await db.commit()
        await db.refresh(lead)

        return {
            "lead": _lead_to_dict(lead),
            "agent_response": content,
            "parsed": parsed,
            "cost_usd": agent_result.get("cost_usd", 0),
            "duration_ms": agent_result.get("duration_ms", 0),
        }
    except Exception as e:
        logger.exception("Agent action on lead failed")
        raise HTTPException(500, f"Agent action failed: {str(e)}")


async def _parse_and_create_leads(output: dict, source: str, db: AsyncSession) -> list[dict]:
    """Parse various agent output formats into Lead records."""
    leads_data = []

    # Handle different output structures (including nested scout_report)
    if "scout_report" in output and isinstance(output["scout_report"], dict):
        leads_data = output["scout_report"].get("businesses", [])
    elif "businesses" in output:
        leads_data = output["businesses"]
    elif "leads" in output:
        leads_data = output["leads"]
    elif "prospects" in output:
        leads_data = output["prospects"]
    elif "results" in output:
        leads_data = output["results"]
    elif isinstance(output, list):
        leads_data = output
    elif "business_name" in output:
        leads_data = [output]

    created = []
    for item in leads_data:
        if not isinstance(item, dict):
            continue
        biz_name = item.get("business_name") or item.get("name") or item.get("business")
        if not biz_name:
            continue

        lead = Lead(
            business_name=biz_name[:200],
            contact_name=(item.get("contact_name") or item.get("owner") or "")[:200] or None,
            email=(item.get("email") or "")[:200] or None,
            phone=(item.get("phone") or "")[:50] or None,
            website_url=(item.get("website_url") or item.get("website") or "")[:500] or None,
            industry=(item.get("industry") or item.get("category") or item.get("type") or "")[:100] or None,
            location=(item.get("location") or item.get("address") or "")[:200] or None,
            country=item.get("country", "MX"),
            language=item.get("language", "es"),
            stage=LeadStage.PROSPECT,
            score=min(max(int(item.get("score", 0)), 0), 100),
            source=source[:200],
            digital_gap_score=item.get("digital_gap_score"),
            google_rating=item.get("google_rating") or item.get("rating"),
            review_count=item.get("review_count") or item.get("reviews"),
            has_website=item.get("has_website"),
            has_social=item.get("has_social"),
            recommended_service_tier=item.get("recommended_service_tier") or item.get("recommended_tier"),
        )
        db.add(lead)
        created.append(lead)

    if created:
        await db.commit()
        for lead in created:
            await db.refresh(lead)

    return [_lead_to_dict(lead) for lead in created]
