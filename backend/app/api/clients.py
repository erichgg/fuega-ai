"""Client management routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database.engine import get_db
from backend.app.database.models import Client, ClientDeliverable, Invoice
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime, timezone

router = APIRouter()


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    business_name: Optional[str] = Field(None, max_length=200)
    business_type: Optional[str] = Field(None, max_length=100)
    country: str = Field("MX", min_length=2, max_length=50)
    language: str = Field("es", min_length=2, max_length=10)
    email: Optional[EmailStr] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50, pattern=r'^[+\d\s\-().]+$')
    plan_tier: Optional[str] = Field(None, max_length=50)
    monthly_rate_usd: float = Field(0.0, ge=0.0, le=100000.0)
    website_url: Optional[str] = Field(None, max_length=500)
    brand_voice_notes: Optional[str] = Field(None, max_length=5000)


@router.get("/")
async def list_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).order_by(Client.created_at.desc()))
    clients = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "business_name": c.business_name,
            "business_type": c.business_type,
            "country": c.country,
            "plan_tier": c.plan_tier,
            "monthly_rate_usd": c.monthly_rate_usd,
            "status": c.status,
            "start_date": c.start_date.isoformat() if c.start_date else None,
        }
        for c in clients
    ]


@router.post("/")
async def create_client(body: ClientCreate, db: AsyncSession = Depends(get_db)):
    client = Client(**body.model_dump(), start_date=datetime.now(timezone.utc))
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return {"id": client.id, "name": client.name, "status": "created"}


@router.get("/{client_id}")
async def get_client(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Client not found")

    deliverables = await db.execute(
        select(ClientDeliverable).where(ClientDeliverable.client_id == client_id)
        .order_by(ClientDeliverable.due_date)
    )

    invoices = await db.execute(
        select(Invoice).where(Invoice.client_id == client_id)
        .order_by(Invoice.created_at.desc())
    )

    def _mask_email(email: str | None) -> str | None:
        if not email or "@" not in email:
            return email
        local, domain = email.rsplit("@", 1)
        return f"{local[:2]}***@{domain}" if len(local) > 2 else f"***@{domain}"

    def _mask_phone(phone: str | None) -> str | None:
        if not phone:
            return phone
        return f"***{phone[-4:]}" if len(phone) > 4 else "***"

    return {
        "id": client.id,
        "name": client.name,
        "business_name": client.business_name,
        "business_type": client.business_type,
        "country": client.country,
        "language": client.language,
        "email": _mask_email(client.email),
        "phone": _mask_phone(client.phone),
        "plan_tier": client.plan_tier,
        "monthly_rate_usd": client.monthly_rate_usd,
        "website_url": client.website_url,
        "brand_voice_notes": client.brand_voice_notes,
        "status": client.status,
        "deliverables": [
            {
                "id": d.id, "title": d.title, "service_type": d.service_type,
                "status": d.status.value if d.status else "pending",
                "due_date": d.due_date.isoformat() if d.due_date else None,
            }
            for d in deliverables.scalars().all()
        ],
        "invoices": [
            {
                "id": inv.id, "amount_usd": inv.amount_usd, "status": inv.status,
                "period_start": inv.period_start.isoformat() if inv.period_start else None,
            }
            for inv in invoices.scalars().all()
        ],
    }
