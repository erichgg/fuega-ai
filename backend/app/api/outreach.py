"""Outreach API — voice clips, follow-ups, and personalized outreach."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.auth import get_current_user
from backend.app.database.engine import get_db
from backend.app.database.models import Lead, LeadStage
from backend.app.config import get_settings
from backend.app.core.followup import (
    get_pending_followups,
    generate_followup,
    get_followup_history,
)
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path
from datetime import datetime
import structlog

logger = structlog.get_logger()

router = APIRouter(dependencies=[Depends(get_current_user)])


# ── Greeting templates ──────────────────────────────────────────────────────

GREETING_TEMPLATES = {
    "introduction": {
        "es": "Hola, soy Ana de Fuega AI. Notamos que {business_name} tiene una gran reputacion pero poca presencia digital. Nos encantaria ayudarles a conseguir mas clientes en linea.",
        "pt": "Ola, sou Ana da Fuega AI. Notamos que {business_name} tem uma otima reputacao mas pouca presenca digital. Adorariamos ajuda-los a conquistar mais clientes online.",
    },
    "followup": {
        "es": "Hola de nuevo, solo queria dar seguimiento sobre como podemos ayudar a {business_name} a crecer su presencia digital y conseguir mas clientes.",
        "pt": "Ola novamente, so queria dar seguimento sobre como podemos ajudar {business_name} a crescer sua presenca digital e conquistar mais clientes.",
    },
    "value_prop": {
        "es": "En Fuega AI ayudamos a negocios como {business_name} a conseguir mas clientes con marketing digital automatizado. Creamos sitios web, manejamos redes sociales y optimizamos tu presencia en Google.",
        "pt": "Na Fuega AI ajudamos negocios como {business_name} a conquistar mais clientes com marketing digital automatizado. Criamos sites, gerenciamos redes sociais e otimizamos sua presenca no Google.",
    },
}


# ── Request/response models ────────────────────────────────────────────────


class VoiceClipRequest(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    language: str = Field("es", max_length=10)
    greeting_type: str = Field("introduction", pattern=r"^(introduction|followup|value_prop)$")


class SendFollowupRequest(BaseModel):
    dry_run: bool = Field(False, description="If true, generate but do not send")


# ── Voice clip endpoints ────────────────────────────────────────────────────


def _get_media_dir() -> Path:
    """Return the appropriate media/audio directory."""
    settings = get_settings()
    if settings.environment == "production":
        return Path("/app/data/media/audio")
    return Path(__file__).parent.parent.parent / "media" / "audio"


@router.post("/voice-clip")
async def generate_voice_clip(req: VoiceClipRequest):
    """Generate a personalized voice greeting via ElevenLabs."""
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")

    # Build the script from template
    lang = req.language if req.language in ("es", "pt") else "es"
    template = GREETING_TEMPLATES.get(req.greeting_type, GREETING_TEMPLATES["introduction"])
    script = template[lang].format(business_name=req.business_name)

    from backend.app.integrations.elevenlabs import generate_speech

    try:
        result = await generate_speech(text=script)
    except Exception as e:
        logger.error("voice_clip_generation_failed", error=str(e))
        raise HTTPException(status_code=502, detail=f"ElevenLabs API error: {str(e)}")

    # Estimate cost: ElevenLabs charges ~$0.30 per 1K characters
    char_count = len(script)
    cost_usd = round((char_count / 1000) * 0.30, 4)

    # Estimate duration: ~150 words per minute for Spanish, avg 5 chars per word
    word_count = char_count / 5
    duration_seconds = round((word_count / 150) * 60, 1)

    audio_url = f"/media/audio/{result['filename']}"

    logger.info(
        "voice_clip_generated",
        business=req.business_name,
        greeting_type=req.greeting_type,
        language=lang,
        duration=duration_seconds,
    )

    return {
        "audio_url": audio_url,
        "duration_seconds": duration_seconds,
        "cost_usd": cost_usd,
        "filename": result["filename"],
        "script": script,
        "greeting_type": req.greeting_type,
        "language": lang,
    }


@router.get("/voice-clips")
async def list_voice_clips():
    """List all generated voice clips."""
    media_dir = _get_media_dir()
    media_dir.mkdir(parents=True, exist_ok=True)

    clips = []
    for f in sorted(media_dir.glob("voiceover_*.mp3"), key=lambda p: p.stat().st_mtime, reverse=True):
        stat = f.stat()
        clips.append({
            "filename": f.name,
            "audio_url": f"/media/audio/{f.name}",
            "size_bytes": stat.st_size,
            "created_at": datetime.utcfromtimestamp(stat.st_mtime).isoformat(),
        })
    return {"clips": clips, "total": len(clips)}


# ── Follow-up endpoints ────────────────────────────────────────────────────


@router.get("/pending-followups")
async def pending_followups(db: AsyncSession = Depends(get_db)):
    """Get leads that need follow-up today."""
    leads = await get_pending_followups(db)
    from backend.app.api.leads import _lead_to_dict
    return {
        "pending": [
            {
                **_lead_to_dict(lead),
                "followup_count": lead.followup_count or 0,
                "last_followup_at": lead.last_followup_at.isoformat() if lead.last_followup_at else None,
            }
            for lead in leads
        ],
        "total": len(leads),
    }


@router.post("/send-followup/{lead_id}")
async def send_followup(lead_id: int, body: SendFollowupRequest = SendFollowupRequest(), db: AsyncSession = Depends(get_db)):
    """Trigger follow-up for a specific lead."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    if lead.stage in (LeadStage.WON, LeadStage.LOST, LeadStage.RESPONDED):
        raise HTTPException(400, f"Cannot follow up on lead with stage '{lead.stage.value}'")

    try:
        followup_data = await generate_followup(lead, db, dry_run=body.dry_run)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return followup_data


@router.get("/sequence/{lead_id}")
async def followup_sequence(lead_id: int, db: AsyncSession = Depends(get_db)):
    """View the full follow-up history and schedule for a lead."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    history = await get_followup_history(lead, db)
    return history
