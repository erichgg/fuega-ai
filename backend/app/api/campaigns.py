"""Ad and Email campaign routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.engine import get_db
from backend.app.database.models import AdCampaign, EmailCampaign
from backend.app.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/ads")
async def list_ad_campaigns(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdCampaign).order_by(AdCampaign.created_at.desc()).limit(50))
    return [
        {
            "id": c.id, "client_id": c.client_id, "platform": c.platform,
            "name": c.name, "status": c.status, "budget_daily_usd": c.budget_daily_usd,
            "total_spend_usd": c.total_spend_usd, "impressions": c.impressions,
            "clicks": c.clicks, "ctr": c.ctr, "cpc": c.cpc, "roas": c.roas,
        }
        for c in result.scalars().all()
    ]


@router.get("/email")
async def list_email_campaigns(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmailCampaign).order_by(EmailCampaign.created_at.desc()).limit(50))
    return [
        {
            "id": c.id, "client_id": c.client_id, "name": c.name,
            "subject": c.subject, "status": c.status,
            "sent_count": c.sent_count, "open_rate": c.open_rate, "click_rate": c.click_rate,
        }
        for c in result.scalars().all()
    ]
