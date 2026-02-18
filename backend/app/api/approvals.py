"""Approval queue routes for HITL (Human-in-the-Loop) system."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth import get_current_user
from backend.app.database.engine import get_db
from backend.app.database.models import (
    ApprovalRequest, ApprovalStatus, User,
)
from backend.app.core.message_bus import message_bus
from backend.app.core.workflow_engine import workflow_engine

router = APIRouter(dependencies=[Depends(get_current_user)])


# ── Pydantic schemas ────────────────────────────────────────────────────────

class ApproveBody(BaseModel):
    modified_payload: Optional[dict] = None


class RejectBody(BaseModel):
    reason: str = Field(..., min_length=1, max_length=2000)


class BulkApproveBody(BaseModel):
    ids: list[int] = Field(..., min_length=1)


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/count")
async def approval_count(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return count of pending approvals for the notification badge."""
    result = await db.execute(
        select(func.count(ApprovalRequest.id)).where(
            ApprovalRequest.status == ApprovalStatus.PENDING
        )
    )
    pending = result.scalar() or 0
    return {"count": pending}


@router.get("")
async def list_approvals(
    status: Optional[str] = Query(default="pending"),
    agent_slug: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List approval requests with filters."""
    query = select(ApprovalRequest).order_by(ApprovalRequest.created_at.desc())

    if status:
        try:
            status_enum = ApprovalStatus(status)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status}")
        query = query.where(ApprovalRequest.status == status_enum)

    if agent_slug:
        query = query.where(ApprovalRequest.agent_slug == agent_slug)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    # Get total pending count for badge
    pending_result = await db.execute(
        select(func.count(ApprovalRequest.id)).where(
            ApprovalRequest.status == ApprovalStatus.PENDING
        )
    )
    total_pending = pending_result.scalar() or 0

    return {
        "items": [
            {
                "id": item.id,
                "agent_slug": item.agent_slug,
                "action_name": item.action_name,
                "payload": item.payload,
                "context": item.context,
                "status": item.status.value if item.status else "pending",
                "decided_by": item.decided_by,
                "decided_at": item.decided_at.isoformat() if item.decided_at else None,
                "rejection_reason": item.rejection_reason,
                "modified_payload": item.modified_payload,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "expires_at": item.expires_at.isoformat() if item.expires_at else None,
            }
            for item in items
        ],
        "total_pending": total_pending,
    }


@router.get("/{approval_id}")
async def get_approval(
    approval_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single approval request with full payload."""
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Approval request not found")

    return {
        "id": item.id,
        "agent_slug": item.agent_slug,
        "action_name": item.action_name,
        "payload": item.payload,
        "context": item.context,
        "status": item.status.value if item.status else "pending",
        "decided_by": item.decided_by,
        "decided_at": item.decided_at.isoformat() if item.decided_at else None,
        "rejection_reason": item.rejection_reason,
        "modified_payload": item.modified_payload,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
    }


@router.post("/{approval_id}/approve")
async def approve_action(
    approval_id: int,
    body: Optional[ApproveBody] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Approve a pending action. Optionally modify the payload before approving."""
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Approval request not found")
    if item.status != ApprovalStatus.PENDING:
        raise HTTPException(400, f"Approval is already {item.status.value}")

    item.status = ApprovalStatus.APPROVED
    item.decided_by = user.id
    item.decided_at = datetime.utcnow()
    if body and body.modified_payload:
        item.modified_payload = body.modified_payload

    await db.commit()

    await message_bus.publish("approval.decided", {
        "approval_id": item.id,
        "agent_slug": item.agent_slug,
        "action_name": item.action_name,
        "status": "approved",
        "decided_by": user.id,
    })

    # Resume any workflow paused on this approval
    try:
        await workflow_engine.resume_from_approval(item.id, db, approved=True)
    except Exception:
        pass  # Non-fatal: approval may not be linked to a workflow

    return {"status": "approved", "id": item.id}


@router.post("/{approval_id}/reject")
async def reject_action(
    approval_id: int,
    body: RejectBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Reject a pending action with a reason."""
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Approval request not found")
    if item.status != ApprovalStatus.PENDING:
        raise HTTPException(400, f"Approval is already {item.status.value}")

    item.status = ApprovalStatus.REJECTED
    item.decided_by = user.id
    item.decided_at = datetime.utcnow()
    item.rejection_reason = body.reason

    await db.commit()

    await message_bus.publish("approval.decided", {
        "approval_id": item.id,
        "agent_slug": item.agent_slug,
        "action_name": item.action_name,
        "status": "rejected",
        "reason": body.reason,
        "decided_by": user.id,
    })

    # Cancel any workflow paused on this approval
    try:
        await workflow_engine.resume_from_approval(item.id, db, approved=False)
    except Exception:
        pass  # Non-fatal

    return {"status": "rejected", "id": item.id}


@router.post("/bulk-approve")
async def bulk_approve(
    body: BulkApproveBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Approve multiple pending actions at once."""
    result = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.id.in_(body.ids),
            ApprovalRequest.status == ApprovalStatus.PENDING,
        )
    )
    items = result.scalars().all()

    now = datetime.utcnow()
    approved_count = 0
    for item in items:
        item.status = ApprovalStatus.APPROVED
        item.decided_by = user.id
        item.decided_at = now
        approved_count += 1

    await db.commit()

    # Publish events and resume workflows for each approved item
    for item in items:
        await message_bus.publish("approval.decided", {
            "approval_id": item.id,
            "agent_slug": item.agent_slug,
            "action_name": item.action_name,
            "status": "approved",
            "decided_by": user.id,
        })
        try:
            await workflow_engine.resume_from_approval(item.id, db, approved=True)
        except Exception:
            pass  # Non-fatal

    return {"approved": approved_count, "requested": len(body.ids)}
