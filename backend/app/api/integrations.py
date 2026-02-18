"""Integration API endpoints — real external service calls."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from backend.app.config import get_settings
from backend.app.auth import get_current_user
import structlog

logger = structlog.get_logger()

router = APIRouter(dependencies=[Depends(get_current_user)])


# ── Request models ──────────────────────────────────────────────────────────


class ElevenLabsRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    model_id: str = "eleven_multilingual_v2"


class PexelsSearchRequest(BaseModel):
    query: str
    per_page: int = 10
    page: int = 1


class OpenAIImageRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
    quality: str = "standard"


class ResendEmailRequest(BaseModel):
    to: str
    subject: str
    html_body: str
    from_name: str = "Fuega AI"
    from_agent: str | None = None


class TwitterPostRequest(BaseModel):
    text: str
    media_url: str | None = None


# ── Status endpoint ─────────────────────────────────────────────────────────


@router.get("/status")
async def integration_status():
    """Check which API keys are configured."""
    s = get_settings()
    return {
        "elevenlabs": {"configured": bool(s.elevenlabs_api_key), "service": "Text-to-Speech"},
        "pexels": {"configured": bool(s.pexels_api_key), "service": "Stock Photos & Video"},
        "resend": {"configured": bool(s.resend_api_key), "service": "Email"},
        "openai": {"configured": bool(s.openai_api_key), "service": "Image Generation (DALL-E)"},
        "twitter": {"configured": bool(s.twitter_api_key and s.twitter_access_token), "service": "Social Posting"},
        "youtube": {"configured": bool(s.youtube_api_key), "service": "Video Publishing"},
        "wordpress": {"configured": bool(s.wordpress_url), "service": "Blog Publishing"},
        "buffer": {"configured": bool(s.buffer_access_token), "service": "Social Scheduling"},
    }


# ── ElevenLabs ──────────────────────────────────────────────────────────────


@router.post("/elevenlabs/generate")
async def elevenlabs_generate(req: ElevenLabsRequest):
    """Generate voiceover audio from text."""
    if not get_settings().elevenlabs_api_key:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")
    from backend.app.integrations.elevenlabs import generate_speech
    try:
        return await generate_speech(req.text, req.voice_id, req.model_id)
    except Exception as e:
        logger.error("elevenlabs_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"ElevenLabs API error: {str(e)}")


@router.get("/elevenlabs/voices")
async def elevenlabs_voices():
    """List available ElevenLabs voices."""
    if not get_settings().elevenlabs_api_key:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")
    from backend.app.integrations.elevenlabs import list_voices
    try:
        return await list_voices()
    except Exception as e:
        logger.error("elevenlabs_voices_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"ElevenLabs API error: {str(e)}")


# ── Pexels ──────────────────────────────────────────────────────────────────


@router.post("/pexels/search-photos")
async def pexels_search_photos(req: PexelsSearchRequest):
    """Search Pexels for stock photos."""
    if not get_settings().pexels_api_key:
        raise HTTPException(status_code=503, detail="Pexels API key not configured")
    from backend.app.integrations.pexels import search_photos
    try:
        return await search_photos(req.query, req.per_page, req.page)
    except Exception as e:
        logger.error("pexels_photos_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Pexels API error: {str(e)}")


@router.post("/pexels/search-videos")
async def pexels_search_videos(req: PexelsSearchRequest):
    """Search Pexels for stock videos."""
    if not get_settings().pexels_api_key:
        raise HTTPException(status_code=503, detail="Pexels API key not configured")
    from backend.app.integrations.pexels import search_videos
    try:
        return await search_videos(req.query, req.per_page, req.page)
    except Exception as e:
        logger.error("pexels_videos_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Pexels API error: {str(e)}")


# ── OpenAI DALL-E ───────────────────────────────────────────────────────────


@router.post("/openai/generate-image")
async def openai_generate_image(req: OpenAIImageRequest):
    """Generate image from prompt via DALL-E."""
    if not get_settings().openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    from backend.app.integrations.openai_images import generate_image
    try:
        return await generate_image(req.prompt, req.size, req.quality)
    except Exception as e:
        logger.error("openai_image_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")


# ── Resend ──────────────────────────────────────────────────────────────────


@router.post("/resend/send-email")
async def resend_send_email(req: ResendEmailRequest):
    """Send an email via Resend."""
    if not get_settings().resend_api_key:
        raise HTTPException(status_code=503, detail="Resend API key not configured")
    from backend.app.integrations.resend_email import send_email, send_outreach, AGENT_EMAILS
    try:
        if req.from_agent and req.from_agent in AGENT_EMAILS:
            return await send_outreach(
                lead_email=req.to,
                subject=req.subject,
                body=req.html_body,
                agent_slug=req.from_agent,
            )
        return await send_email(req.to, req.subject, req.html_body, req.from_name)
    except Exception as e:
        logger.error("resend_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Resend API error: {str(e)}")


# ── Twitter ─────────────────────────────────────────────────────────────────


@router.post("/twitter/post")
async def twitter_post(req: TwitterPostRequest):
    """Post a tweet, optionally with media."""
    s = get_settings()
    if not s.twitter_api_key or not s.twitter_access_token:
        raise HTTPException(status_code=503, detail="Twitter API keys not configured")
    from backend.app.integrations.twitter import post_tweet, upload_media
    try:
        media_ids = None
        if req.media_url:
            result = await upload_media(req.media_url)
            media_ids = [result["media_id"]]
        return await post_tweet(req.text, media_ids)
    except Exception as e:
        logger.error("twitter_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Twitter API error: {str(e)}")
