import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.models.user import User
from src.models.invitation import Invitation
from src.schemas.auth import (
    InviteRequest, InviteResponse, InvitePreviewResponse,
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

    # If not first user and invite_only mode, require invite token
    if not is_first_user and settings.REGISTRATION_MODE == 'invite_only' and not body.invite_token:
        raise HTTPException(status_code=403, detail="Registration requires an invitation")

    invitation = None
    role = 'admin' if is_first_user else 'builder'
    team_id = None

    if body.invite_token:
        inv_result = await db.execute(
            select(Invitation).where(
                Invitation.token == body.invite_token,
                Invitation.accepted_at.is_(None),
                Invitation.expires_at > datetime.now(timezone.utc),
            )
        )
        invitation = inv_result.scalar_one_or_none()
        if not invitation:
            raise HTTPException(status_code=404, detail="This invitation link is invalid or has expired")
        role = invitation.role
        team_id = invitation.team_id

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

    if invitation:
        invitation.accepted_at = datetime.now(timezone.utc)

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


@router.get(
    "/invite/{token}",
    response_model=InvitePreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview an invitation by token",
)
async def get_invite_preview(token: str, db: AsyncSession = Depends(get_db)) -> InvitePreviewResponse:
    from src.models.team import Team
    result = await db.execute(
        select(Invitation).where(
            Invitation.token == token,
            Invitation.accepted_at.is_(None),
            Invitation.expires_at > datetime.now(timezone.utc),
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")

    # Get team name
    team_result = await db.execute(select(Team).where(Team.id == invitation.team_id))
    team = team_result.scalar_one_or_none()
    team_name = team.name if team else "your team"

    # Get inviter name
    inviter_result = await db.execute(select(User).where(User.id == invitation.invited_by))
    inviter = inviter_result.scalar_one_or_none()
    inviter_name = inviter.name if inviter else "A teammate"

    return InvitePreviewResponse(
        email=invitation.email,
        role=invitation.role,
        team_name=team_name,
        invited_by_name=inviter_name,
    )


@router.post(
    "/invite",
    response_model=InviteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a user to the team",
)
async def invite_user(
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.role not in ("lead", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only leads and admins can invite team members",
        )
    if not current_user.team_id:
        raise HTTPException(status_code=400, detail="You must belong to a team to send invitations")

    # Check for existing pending invitation
    existing_result = await db.execute(
        select(Invitation).where(
            Invitation.email == body.email,
            Invitation.team_id == current_user.team_id,
            Invitation.accepted_at.is_(None),
            Invitation.expires_at > datetime.now(timezone.utc),
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A pending invitation already exists for this email")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invitation = Invitation(
        team_id=current_user.team_id,
        invited_by=current_user.id,
        email=body.email,
        role=body.role,
        token=token,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    # Send email (fire and forget)
    sent = False
    try:
        from src.services.email_service import send_invitation_email
        from src.models.team import Team
        t_result = await db.execute(select(Team).where(Team.id == current_user.team_id))
        t = t_result.scalar_one_or_none()
        team_name = t.name if t else "your team"
        await send_invitation_email(body.email, current_user.name, team_name, token, body.role)
        sent = True
    except Exception:
        pass

    return {
        "invitation_id": str(invitation.id),
        "email": invitation.email,
        "expires_at": invitation.expires_at.isoformat(),
        "sent": sent,
    }
