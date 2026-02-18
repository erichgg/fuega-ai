"""Pexels stock photo and video search integration."""
import httpx
from backend.app.config import get_settings
import structlog

logger = structlog.get_logger()

BASE_URL = "https://api.pexels.com"


def _headers() -> dict:
    return {"Authorization": get_settings().pexels_api_key}


async def search_photos(query: str, per_page: int = 10, page: int = 1) -> dict:
    """Search Pexels for stock photos."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/v1/search",
            headers=_headers(),
            params={"query": query, "per_page": per_page, "page": page},
        )
        resp.raise_for_status()
        data = resp.json()

        photos = [
            {
                "id": p["id"],
                "url": p["url"],
                "photographer": p["photographer"],
                "src": {
                    "original": p["src"]["original"],
                    "large": p["src"]["large"],
                    "medium": p["src"]["medium"],
                    "small": p["src"]["small"],
                    "thumbnail": p["src"]["tiny"],
                },
                "alt": p.get("alt", ""),
            }
            for p in data.get("photos", [])
        ]

        logger.info("pexels_photo_search", query=query, results=len(photos))
        return {"photos": photos, "total_results": data.get("total_results", 0), "page": page}


async def search_videos(query: str, per_page: int = 10, page: int = 1) -> dict:
    """Search Pexels for stock videos."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/videos/search",
            headers=_headers(),
            params={"query": query, "per_page": per_page, "page": page},
        )
        resp.raise_for_status()
        data = resp.json()

        videos = [
            {
                "id": v["id"],
                "url": v["url"],
                "duration": v["duration"],
                "user": v["user"]["name"],
                "video_files": [
                    {"quality": f["quality"], "link": f["link"], "width": f.get("width"), "height": f.get("height")}
                    for f in v.get("video_files", [])[:3]
                ],
                "image": v.get("image", ""),
            }
            for v in data.get("videos", [])
        ]

        logger.info("pexels_video_search", query=query, results=len(videos))
        return {"videos": videos, "total_results": data.get("total_results", 0), "page": page}
