"""Authentication and authorization utilities."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import get_settings
from backend.app.database.engine import get_db
from backend.app.database.models import APIKey, User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a short-lived JWT access token (default 15 min)."""
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a long-lived JWT refresh token (default 7 days)."""
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises HTTPException on failure."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency: extract and validate user from Bearer token or API key.

    1. Check Authorization header for Bearer JWT token.
    2. Fall back to API key with ``fga_`` prefix.
    3. Return User or raise 401.
    """
    # --- Try Bearer JWT token first ---
    if credentials and credentials.credentials:
        token = credentials.credentials
        # Could be an API key passed as Bearer token
        if token.startswith("fga_"):
            return await _authenticate_api_key(token, db)
        payload = decode_token(token)
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return user

    # --- Fall back to API key in header ---
    api_key = request.headers.get("X-API-Key")
    if api_key and api_key.startswith("fga_"):
        return await _authenticate_api_key(api_key, db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _authenticate_api_key(key: str, db: AsyncSession) -> User:
    """Validate an API key and return its owning User."""
    prefix = key[:8]
    result = await db.execute(
        select(APIKey).where(APIKey.key_prefix == prefix, APIKey.is_active == True)  # noqa: E712
    )
    api_key_records = result.scalars().all()
    for record in api_key_records:
        if verify_password(key, record.key_hash):
            # Update last_used
            record.last_used = datetime.utcnow()
            await db.commit()
            # Load user
            user_result = await db.execute(select(User).where(User.id == record.user_id))
            user = user_result.scalar_one_or_none()
            if user is None or not user.is_active:
                raise HTTPException(status_code=401, detail="API key owner not found or inactive")
            return user
    raise HTTPException(status_code=401, detail="Invalid API key")


def require_role(*roles: UserRole):
    """Dependency factory for role-based access control.

    Usage: ``dependencies=[Depends(require_role(UserRole.ADMIN))]``
    """
    async def _check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(r.value for r in roles)}",
            )
        return current_user
    return _check_role
