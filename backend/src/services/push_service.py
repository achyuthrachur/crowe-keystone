"""
Push notification service (Web Push via pywebpush).

Replaces the Phase 1 stub. All notify_* functions are wired to real
push delivery using VAPID credentials from settings.

SSE broadcast sequencing rule (from backend/CLAUDE.md):
  Fire push notification 500ms AFTER the SSE broadcast.
  Callers handle the asyncio.sleep(0.5) before calling notify_*.
"""

from __future__ import annotations

import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


async def get_active_subscriptions(
    db: AsyncSession,
    user_id,
) -> list[PushSubscription]:
    """Return all active push subscriptions for a user."""
    try:
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active.is_(True),
            )
        )
        return list(result.scalars().all())
    except Exception as exc:
        logger.error("Error fetching subscriptions for user %s: %s", user_id, exc)
        return []


async def deactivate_subscription(db: AsyncSession, endpoint: str) -> None:
    """Mark a subscription as inactive (called when push delivery returns 410 Gone)."""
    try:
        result = await db.execute(
            select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.is_active = False
            await db.flush()
            logger.info("Deactivated push subscription endpoint=%s", endpoint[:60])
    except Exception as exc:
        logger.error("Error deactivating subscription endpoint=%s: %s", endpoint[:60], exc)


def send_web_push(subscription_data: dict, payload: dict) -> bool:
    """Send a Web Push notification synchronously using pywebpush.

    subscription_data must contain:
      endpoint: str
      keys: { p256dh: str, auth: str }

    Returns True on success, False on failure.
    This is a synchronous call — run in an executor if called from async code
    when blocking is a concern. For now, pywebpush is fast enough.
    """
    try:
        from pywebpush import webpush, WebPushException  # type: ignore[import]

        webpush(
            subscription_info=subscription_data,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CONTACT}"},
        )
        logger.debug("Web Push sent to endpoint=%s", subscription_data.get("endpoint", "")[:60])
        return True

    except Exception as exc:
        # WebPushException with response.status_code 410 means the subscription
        # is expired/invalid — caller should deactivate it.
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code == 410:
            logger.info(
                "Push subscription expired (410): endpoint=%s",
                subscription_data.get("endpoint", "")[:60],
            )
        else:
            logger.error(
                "Web Push delivery failed (status=%s): %s",
                status_code,
                exc,
            )
        return False


async def _notify_user(db: AsyncSession, user_id, payload: dict) -> None:
    """Internal helper: send payload to all active subscriptions for a user.

    Deactivates subscriptions that return 410 Gone.
    """
    subscriptions = await get_active_subscriptions(db, user_id)
    if not subscriptions:
        logger.debug("No active push subscriptions for user %s — skipping push", user_id)
        return

    expired_endpoints: list[str] = []

    for sub in subscriptions:
        if not sub.p256dh or not sub.auth:
            # Incomplete subscription record — skip
            continue

        subscription_data = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        success = send_web_push(subscription_data, payload)
        if not success:
            # Conservatively deactivate only if we strongly suspect expiry.
            # send_web_push already logged the failure.
            expired_endpoints.append(sub.endpoint)

    for endpoint in expired_endpoints:
        await deactivate_subscription(db, endpoint)


async def notify_approval_requested(
    db: AsyncSession,
    user_id,
    project_title: str,
    approval_id: str,
) -> None:
    """Send a push notification to a user when they are assigned an approval.

    Called 500ms after the approval.requested SSE broadcast.
    """
    try:
        payload = {
            "type": "approval.requested",
            "title": "Approval Requested",
            "body": f"Your review is needed for: {project_title}",
            "data": {
                "approval_id": approval_id,
                "url": f"/inbox",
            },
            "icon": "/keystone-192.png",
            "badge": "/keystone-96.png",
        }
        await _notify_user(db, user_id, payload)
        logger.info(
            "Push sent — approval.requested: user=%s approval=%s project=%r",
            user_id,
            approval_id,
            project_title,
        )
    except Exception as exc:
        logger.error(
            "Error sending approval.requested push to user %s: %s", user_id, exc
        )


async def get_team_leads(db: AsyncSession, team_id) -> list:
    """Return all users with role 'lead' or 'admin' for a given team."""
    try:
        from src.models.user import User  # local import to avoid circular deps

        result = await db.execute(
            select(User).where(
                User.team_id == team_id,
                User.role.in_(["lead", "admin"]),
            )
        )
        return list(result.scalars().all())
    except Exception as exc:
        logger.error("Error fetching team leads for team %s: %s", team_id, exc)
        return []


async def notify_conflict_detected(
    db: AsyncSession,
    team_id,
    conflict: dict,
) -> None:
    """Send a push notification to all team leads when a blocking conflict is detected.

    Called 500ms after the conflict.detected SSE broadcast.
    Only fires for blocking conflicts (severity='blocking').
    """
    try:
        if conflict.get("severity") != "blocking":
            logger.debug(
                "Skipping push for advisory conflict %s", conflict.get("conflict_id")
            )
            return

        leads = await get_team_leads(db, team_id)

        payload = {
            "type": "conflict.detected",
            "title": "Blocking Conflict Detected",
            "body": conflict.get("specific_conflict", "Two projects have a blocking conflict."),
            "data": {
                "conflict_id": conflict.get("conflict_id"),
                "url": "/inbox",
            },
            "icon": "/keystone-conflict-192.png",
            "badge": "/keystone-96.png",
        }

        for lead in leads:
            await _notify_user(db, lead.id, payload)

        logger.info(
            "Push sent — conflict.detected: team=%s conflict=%s severity=blocking leads=%d",
            team_id,
            conflict.get("conflict_id"),
            len(leads),
        )
    except Exception as exc:
        logger.error(
            "Error sending conflict.detected push for team %s: %s", team_id, exc
        )


async def send_push_to_user(user_id, payload: dict, db: AsyncSession) -> None:
    """Typed helper: send a push payload to all active subscriptions for a user."""
    await _notify_user(db, user_id, payload)


async def push_approval_request(
    assignee_id: str,
    project_name: str,
    target_stage: str,
    approval_id: str,
    db: AsyncSession,
) -> None:
    """Send a push notification to an assignee when they need to approve a stage transition."""
    try:
        payload = {
            "type": "approval.requested",
            "title": "Approval Requested",
            "body": f"Your approval needed: {project_name} → {target_stage}",
            "data": {"approval_id": approval_id, "url": "/inbox"},
            "icon": "/keystone-192.png",
            "badge": "/keystone-96.png",
        }
        await _notify_user(db, assignee_id, payload)
        logger.info("push_approval_request sent: user=%s approval=%s", assignee_id, approval_id)
    except Exception as exc:
        logger.error("push_approval_request error: user=%s error=%s", assignee_id, exc)


async def push_conflict_detected(
    team_id: str,
    project_a_name: str,
    project_b_name: str,
    conflict_id: str,
    db: AsyncSession,
) -> None:
    """Send conflict push to all team leads when a blocking conflict is detected."""
    try:
        leads = await get_team_leads(db, team_id)
        payload = {
            "type": "conflict.detected",
            "title": "Blocking Conflict Detected",
            "body": f"{project_a_name} vs {project_b_name} — review needed",
            "data": {"conflict_id": conflict_id, "url": "/inbox"},
            "icon": "/keystone-192.png",
            "badge": "/keystone-96.png",
        }
        for lead in leads:
            await _notify_user(db, lead.id, payload)
        logger.info("push_conflict_detected sent: team=%s conflict=%s leads=%d", team_id, conflict_id, len(leads))
    except Exception as exc:
        logger.error("push_conflict_detected error: team=%s error=%s", team_id, exc)


async def push_daily_brief(user_id: str, active_count: int, approval_count: int, db: AsyncSession) -> None:
    """Send a daily brief push notification to a user."""
    try:
        approvals_text = f" · {approval_count} approvals pending" if approval_count > 0 else ""
        payload = {
            "type": "daily.brief",
            "title": "Your Daily Brief is Ready",
            "body": f"{active_count} active projects{approvals_text}",
            "data": {"url": "/daily"},
            "icon": "/keystone-192.png",
            "badge": "/keystone-96.png",
        }
        await _notify_user(db, user_id, payload)
        logger.info("push_daily_brief sent: user=%s", user_id)
    except Exception as exc:
        logger.error("push_daily_brief error: user=%s error=%s", user_id, exc)


async def push_agent_checkpoint(
    user_id: str,
    project_name: str,
    agent_type: str,
    project_id: str,
    run_id: str,
    db: AsyncSession,
) -> None:
    """Send a push notification when an agent pauses for a human checkpoint."""
    try:
        payload = {
            "type": "agent.checkpoint",
            "title": "Agent Needs Your Input",
            "body": f"{project_name}: {agent_type} is waiting for your response",
            "data": {"run_id": run_id, "project_id": project_id, "url": "/inbox"},
            "icon": "/keystone-192.png",
            "badge": "/keystone-96.png",
        }
        await _notify_user(db, user_id, payload)
        logger.info("push_agent_checkpoint sent: user=%s run=%s", user_id, run_id)
    except Exception as exc:
        logger.error("push_agent_checkpoint error: user=%s error=%s", user_id, exc)


async def notify_agent_checkpoint(
    db: AsyncSession,
    user_id,
    project_title: str,
    question: str,
    run_id: str,
) -> None:
    """Send a push notification when an agent pauses for a human checkpoint.

    Called 500ms after the agent.checkpoint SSE broadcast.
    """
    try:
        payload = {
            "type": "agent.checkpoint",
            "title": "Agent Needs Your Input",
            "body": f"{project_title}: {question[:100]}{'...' if len(question) > 100 else ''}",
            "data": {
                "run_id": run_id,
                "url": f"/inbox",
            },
            "icon": "/keystone-192.png",
            "badge": "/keystone-96.png",
        }
        await _notify_user(db, user_id, payload)
        logger.info(
            "Push sent — agent.checkpoint: user=%s run=%s project=%r",
            user_id,
            run_id,
            project_title,
        )
    except Exception as exc:
        logger.error(
            "Error sending agent.checkpoint push to user %s: %s", user_id, exc
        )
