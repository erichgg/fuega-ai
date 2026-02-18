"""Authentication routes — register, login, refresh, API keys."""
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.app.database.engine import get_db
from backend.app.database.models import APIKey, AuditLog, User, UserRole

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ── Request / response schemas ───────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field("", max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str


class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _log_audit(
    db: AsyncSession,
    action: str,
    request: Request,
    user_id: int | None = None,
    resource: str | None = None,
    details: dict | None = None,
) -> None:
    """Write an audit-log entry."""
    ip = request.client.host if request.client else None
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        details=details,
        ip_address=ip,
    )
    db.add(entry)
    await db.commit()


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/register")
@limiter.limit("10/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account.

    The very first user is automatically promoted to ADMIN.
    Subsequent registrations require an authenticated admin.
    """
    # Check if any users exist yet
    count_result = await db.execute(select(func.count(User.id)))
    user_count = count_result.scalar() or 0

    if user_count > 0:
        # Require admin auth for subsequent registrations
        # Manually extract current user (can't use Depends since this endpoint is public for first user)
        try:
            admin = await get_current_user(
                request=request,
                credentials=None,  # Will be extracted inside get_current_user via bearer_scheme
                db=db,
            )
        except HTTPException:
            raise HTTPException(status_code=403, detail="Admin authentication required to register new users")
        if admin.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admins can register new users")

    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    role = UserRole.ADMIN if user_count == 0 else UserRole.OPERATOR
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _log_audit(db, "user.register", request, user_id=user.id, resource="users")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
        "message": "Account created" + (" (admin)" if role == UserRole.ADMIN else ""),
    }


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password; returns access and refresh tokens."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    user.last_login = datetime.utcnow()
    await db.commit()

    await _log_audit(db, "user.login", request, user_id=user.id, resource="auth")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    }


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    }


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
    }


@router.post("/api-keys")
async def create_api_key(
    body: APIKeyCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an API key. The full key is returned ONCE and never stored."""
    raw_key = "fga_" + secrets.token_urlsafe(32)
    key_hash = hash_password(raw_key)
    prefix = raw_key[:8]

    api_key = APIKey(
        user_id=current_user.id,
        name=body.name,
        key_hash=key_hash,
        key_prefix=prefix,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    await _log_audit(
        db, "apikey.create", request,
        user_id=current_user.id, resource="api_keys",
        details={"key_name": body.name, "key_prefix": prefix},
    )

    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,
        "key_prefix": prefix,
        "message": "Store this key securely — it will not be shown again.",
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (deactivate) an API key."""
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    await db.commit()

    await _log_audit(
        db, "apikey.revoke", request,
        user_id=current_user.id, resource="api_keys",
        details={"key_id": key_id, "key_prefix": api_key.key_prefix},
    )

    return {"status": "revoked", "key_id": key_id}
