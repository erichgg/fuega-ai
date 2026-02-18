"""Content management routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.engine import get_db
from backend.app.database.models import ContentIdea, ContentDraft, PublishedContent, ContentMetric, ContentStatus
from backend.app.auth import get_current_user
from typing import Optional
from pydantic import BaseModel

router = APIRouter(dependencies=[Depends(get_current_user)])


class IdeaCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_platform: Optional[str] = None
    target_language: Optional[str] = "es"
    keywords: Optional[list[str]] = None
    category: Optional[str] = None


@router.post("/ideas")
async def create_idea(body: IdeaCreate, db: AsyncSession = Depends(get_db)):
    idea = ContentIdea(
        title=body.title,
        description=body.description,
        target_platform=body.target_platform,
        target_language=body.target_language,
        keywords=body.keywords,
        category=body.category,
        status=ContentStatus.IDEA,
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)
    return {
        "id": idea.id,
        "title": idea.title,
        "description": idea.description,
        "target_platform": idea.target_platform,
        "status": idea.status.value,
        "created_at": idea.created_at.isoformat() if idea.created_at else None,
    }


@router.get("/ideas")
async def list_ideas(status: Optional[str] = None, limit: int = Query(default=50, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    query = select(ContentIdea).order_by(ContentIdea.created_at.desc()).limit(limit)
    if status:
        try:
            status_enum = ContentStatus(status)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status}. Valid values: {[s.value for s in ContentStatus]}")
        query = query.where(ContentIdea.status == status_enum)
    result = await db.execute(query)
    ideas = result.scalars().all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "keywords": i.keywords,
            "target_platform": i.target_platform,
            "target_language": i.target_language,
            "category": i.category,
            "ceo_score": i.ceo_score,
            "status": i.status.value if i.status else "idea",
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in ideas
    ]


@router.get("/drafts")
async def list_drafts(status: Optional[str] = None, limit: int = Query(default=50, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    query = select(ContentDraft).order_by(ContentDraft.updated_at.desc()).limit(limit)
    if status:
        try:
            status_enum = ContentStatus(status)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status}. Valid values: {[s.value for s in ContentStatus]}")
        query = query.where(ContentDraft.status == status_enum)
    result = await db.execute(query)
    drafts = result.scalars().all()
    return [
        {
            "id": d.id,
            "idea_id": d.idea_id,
            "title": d.title,
            "body": d.body[:200] + "..." if d.body and len(d.body) > 200 else d.body,
            "platform": d.platform,
            "language": d.language,
            "editor_score": d.editor_score,
            "revision_count": d.revision_count,
            "status": d.status.value if d.status else "writing",
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in drafts
    ]


@router.get("/published")
async def list_published(limit: int = Query(default=50, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PublishedContent).order_by(PublishedContent.published_at.desc()).limit(limit)
    )
    items = result.scalars().all()
    return [
        {
            "id": p.id,
            "draft_id": p.draft_id,
            "platform": p.platform,
            "url": p.url,
            "published_at": p.published_at.isoformat() if p.published_at else None,
        }
        for p in items
    ]


@router.get("/kanban")
async def content_kanban(db: AsyncSession = Depends(get_db)):
    """Get content organized by status for kanban board."""
    columns = {
        "ideas": ContentStatus.IDEA,
        "approved": ContentStatus.APPROVED,
        "writing": ContentStatus.WRITING,
        "review": ContentStatus.REVIEW,
        "revision": ContentStatus.REVISION,
        "ready": ContentStatus.READY,
        "published": ContentStatus.PUBLISHED,
    }

    result = {}
    for col_name, status in columns.items():
        if col_name == "ideas":
            query_result = await db.execute(
                select(ContentIdea).where(ContentIdea.status == status).order_by(ContentIdea.created_at.desc()).limit(20)
            )
            items = query_result.scalars().all()
            result[col_name] = [{"id": i.id, "title": i.title, "score": i.ceo_score, "platform": i.target_platform, "type": "idea"} for i in items]
        elif col_name == "published":
            query_result = await db.execute(
                select(PublishedContent).order_by(PublishedContent.published_at.desc()).limit(20)
            )
            items = query_result.scalars().all()
            result[col_name] = [{"id": p.id, "platform": p.platform, "url": p.url, "type": "published"} for p in items]
        else:
            query_result = await db.execute(
                select(ContentDraft).where(ContentDraft.status == status).order_by(ContentDraft.updated_at.desc()).limit(20)
            )
            items = query_result.scalars().all()
            result[col_name] = [{"id": d.id, "title": d.title, "score": d.editor_score, "platform": d.platform, "revision": d.revision_count, "type": "draft"} for d in items]

    return result


@router.get("/metrics")
async def content_metrics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContentMetric).order_by(ContentMetric.collected_at.desc()).limit(100)
    )
    metrics = result.scalars().all()
    return [
        {
            "id": m.id,
            "content_id": m.content_id,
            "impressions": m.impressions,
            "engagements": m.engagements,
            "clicks": m.clicks,
            "shares": m.shares,
            "engagement_rate": m.engagement_rate,
            "collected_at": m.collected_at.isoformat() if m.collected_at else None,
        }
        for m in metrics
    ]
