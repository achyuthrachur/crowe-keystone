import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.models.user import User
from src.schemas.auth import (
    LoginRequest, LoginResponse, RegisterRequest, UserResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# JWT bearer scheme — FastAPI dependency
# ---------------------------------------------------------------------------
bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_access_token(user_id: str, team_id: str | None) -> str:
    """Create a signed JWT with user_id and team_id claims."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "team_id": team_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency — validates JWT and returns the authenticated User model."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_user_optional(
    token: Optional[str] = Query(default=None),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Like get_current_user but also accepts the JWT as a ?token= query param.

    EventSource (used for SSE) cannot send custom headers, so the browser must
    pass the JWT in the URL instead of an Authorization header.  We fabricate
    an HTTPAuthorizationCredentials object from the query param and delegate to
    the normal get_current_user validation.
    """
    if credentials is None and token:
        credentials = HTTPAuthorizationCredentials(scheme="bearer", credentials=token)
    return await get_current_user(credentials=credentials, db=db)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Email/password login — returns JWT token and user detail",
)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        user_id=str(user.id),
        team_id=str(user.team_id) if user.team_id else None,
    )

    return LoginResponse(user=UserResponse.model_validate(user), token=token)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout — client should discard the JWT",
)
async def logout(current_user: User = Depends(get_current_user)) -> dict:
    # JWT is stateless; logout is handled client-side by discarding the token.
    # Future enhancement: maintain a token denylist in Redis.
    logger.info("User %s logged out.", current_user.id)
    return {"detail": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Returns the currently authenticated user",
)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> dict:
    from src.models.team import Team  # local import to avoid circular

    # Check if email already exists
    existing_result = await db.execute(select(User).where(User.email == body.email))
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Check how many users exist
    count_result = await db.execute(select(sqlfunc.count()).select_from(User))
    user_count = count_result.scalar() or 0
    is_first_user = user_count == 0

    role = 'admin' if is_first_user else 'builder'
    team_id = None

    # For first user: create a team
    if is_first_user:
        email_domain = body.email.split('@')[-1].split('.')[0]
        import re
        slug_base = re.sub(r'[^a-z0-9]+', '-', email_domain.lower()).strip('-') or 'team'
        slug = f"{slug_base}-{secrets.token_hex(4)}"
        team = Team(name=f"{email_domain.capitalize()} Team", slug=slug)
        db.add(team)
        await db.flush()
        team_id = team.id
    elif team_id is None:
        # Non-first user without invitation: get the first team (for open registration)
        team_result = await db.execute(select(Team).limit(1))
        t = team_result.scalar_one_or_none()
        if t:
            team_id = t.id

    user = User(
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
        role=role,
        team_id=team_id,
        email_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send welcome email (fire and forget)
    try:
        from src.services.email_service import send_welcome_email
        team_name_for_email = "your team"
        if team_id:
            t_result = await db.execute(select(Team).where(Team.id == team_id))
            t = t_result.scalar_one_or_none()
            if t:
                team_name_for_email = t.name
        await send_welcome_email(user.email, user.name, team_name_for_email)
    except Exception:
        pass

    token = create_access_token(str(user.id), str(user.team_id) if user.team_id else None)
    return {"user": UserResponse.model_validate(user).model_dump(mode='json'), "token": token}


