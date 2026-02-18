"""ElevenLabs text-to-speech integration."""
import httpx
from pathlib import Path
from backend.app.config import get_settings
import structlog

logger = structlog.get_logger()

MEDIA_DIR = Path(__file__).parent.parent.parent.parent / "media" / "audio"
BASE_URL = "https://api.elevenlabs.io/v1"


def _headers() -> dict:
    return {"xi-api-key": get_settings().elevenlabs_api_key}


async def list_voices() -> list[dict]:
    """Return available ElevenLabs voices."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{BASE_URL}/voices", headers=_headers())
        resp.raise_for_status()
        data = resp.json()
        return [
            {"voice_id": v["voice_id"], "name": v["name"], "category": v.get("category", "")}
            for v in data.get("voices", [])
        ]


async def generate_speech(
    text: str,
    voice_id: str = "21m00Tcm4TlvDq8ikWAM",  # Rachel default
    model_id: str = "eleven_multilingual_v2",
    stability: float = 0.5,
    similarity_boost: float = 0.75,
) -> dict:
    """Generate speech audio from text. Returns file path and metadata."""
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
        },
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{BASE_URL}/text-to-speech/{voice_id}",
            headers={**_headers(), "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()

        # Save audio file
        import hashlib
        file_hash = hashlib.md5(text[:100].encode()).hexdigest()[:8]
        filename = f"voiceover_{file_hash}.mp3"
        filepath = MEDIA_DIR / filename
        filepath.write_bytes(resp.content)

        logger.info("elevenlabs_generated", file=str(filepath), chars=len(text))
        return {
            "file_path": str(filepath),
            "filename": filename,
            "size_bytes": len(resp.content),
            "text_length": len(text),
            "voice_id": voice_id,
            "model_id": model_id,
        }
