"""OpenAI DALL-E image generation integration."""
import httpx
from pathlib import Path
from backend.app.config import get_settings
import structlog

logger = structlog.get_logger()

MEDIA_DIR = Path(__file__).parent.parent.parent.parent / "media" / "images"
BASE_URL = "https://api.openai.com/v1"


async def generate_image(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "standard",
    model: str = "dall-e-3",
    n: int = 1,
) -> dict:
    """Generate image from prompt via DALL-E. Returns URL and saves locally."""
    settings = get_settings()
    if not settings.openai_api_key:
        return {"error": "OpenAI API key not configured", "configured": False}

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{BASE_URL}/images/generations",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "prompt": prompt,
                "size": size,
                "quality": quality,
                "n": n,
            },
        )
        resp.raise_for_status()
        data = resp.json()

        images = []
        for i, img in enumerate(data.get("data", [])):
            url = img.get("url", "")
            revised_prompt = img.get("revised_prompt", prompt)

            # Download and save locally
            local_path = None
            if url:
                img_resp = await client.get(url)
                if img_resp.status_code == 200:
                    import hashlib
                    file_hash = hashlib.md5(prompt[:50].encode()).hexdigest()[:8]
                    filename = f"dalle_{file_hash}_{i}.png"
                    filepath = MEDIA_DIR / filename
                    filepath.write_bytes(img_resp.content)
                    local_path = str(filepath)

            images.append({
                "url": url,
                "local_path": local_path,
                "revised_prompt": revised_prompt,
            })

        logger.info("openai_image_generated", prompt=prompt[:80], count=len(images))
        return {"images": images, "model": model, "size": size}
