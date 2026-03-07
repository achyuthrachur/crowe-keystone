import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database import get_db
from src.models.push_subscription import PushSubscription
from src.models.user import User
from src.routers.auth import get_current_user
from src.schemas.push import (
    PushDeleteRequest,
    PushSubscribeRequest,
    PushSubscribeResponse,
    VapidPublicKeyResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["push"])


@router.post(
    "/subscribe",
    response_model=PushSubscribeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a Web Push subscription for the current user",
)
async def subscribe(
    body: PushSubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PushSubscribeResponse:
    # Upsert: if the same user+endpoint already exists, update the keys
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == body.endpoint,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.p256dh = body.keys.p256dh
        existing.auth = body.keys.auth
        existing.is_active = True
        await db.flush()
        return PushSubscribeResponse(subscription_id=existing.id)

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.keys.p256dh,
        auth=body.keys.auth,
        is_active=True,
    )
    db.add(sub)
    await db.flush()
    await db.refresh(sub)
    return PushSubscribeResponse(subscription_id=sub.id)


@router.delete(
    "/subscribe",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a Web Push subscription",
)
async def unsubscribe(
    body: PushDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == body.endpoint,
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        # Idempotent — deleting a non-existent subscription is not an error
        return

    await db.delete(sub)


@router.get(
    "/vapid-public-key",
    response_model=VapidPublicKeyResponse,
    status_code=status.HTTP_200_OK,
    summary="Return the VAPID public key for Web Push subscription setup",
)
async def get_vapid_public_key() -> VapidPublicKeyResponse:
    return VapidPublicKeyResponse(key=settings.VAPID_PUBLIC_KEY)


@router.post(
    "/test",
    status_code=status.HTTP_200_OK,
    summary="Send a test push notification to the current user (development only)",
)
async def test_push(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not settings.is_development:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test push is only available in development environment",
        )

    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.is_active.is_(True),
        )
    )
    subscriptions = result.scalars().all()

    if not subscriptions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active push subscriptions found for this user",
        )

    # Phase 1 stub: log the intent without sending actual push.
    # Phase 2 will wire this to push_service.send_notification().
    logger.info(
        "TEST PUSH: would send to %d subscription(s) for user %s",
        len(subscriptions),
        current_user.id,
    )
    return {
        "detail": "Test push logged",
        "subscriptions_found": len(subscriptions),
        "note": "Actual push delivery wired in Phase 2",
    }
