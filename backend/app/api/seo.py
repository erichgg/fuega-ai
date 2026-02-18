"""SEO routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.engine import get_db
from backend.app.database.models import SEOAudit, SEOKeyword
from typing import Optional

router = APIRouter()


@router.get("/audits")
async def list_audits(client_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = select(SEOAudit).order_by(SEOAudit.created_at.desc()).limit(50)
    if client_id is not None:
        query = query.where(SEOAudit.client_id == client_id)
    result = await db.execute(query)
    return [
        {
            "id": a.id, "client_id": a.client_id, "url": a.url,
            "overall_score": a.overall_score, "technical_score": a.technical_score,
            "content_score": a.content_score, "findings": a.findings,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in result.scalars().all()
    ]


@router.get("/keywords")
async def list_keywords(client_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = select(SEOKeyword).order_by(SEOKeyword.opportunity_score.desc()).limit(100)
    if client_id is not None:
        query = query.where(SEOKeyword.client_id == client_id)
    result = await db.execute(query)
    return [
        {
            "id": k.id, "client_id": k.client_id, "keyword": k.keyword,
            "language": k.language, "current_rank": k.current_rank,
            "previous_rank": k.previous_rank, "search_volume": k.search_volume,
            "difficulty": k.difficulty, "opportunity_score": k.opportunity_score,
        }
        for k in result.scalars().all()
    ]
