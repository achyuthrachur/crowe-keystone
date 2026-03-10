"""
Email service using Resend (via httpx).
If RESEND_API_KEY is not set, emails are logged to console (dev mode).
"""
import logging
from typing import Optional
import httpx
from src.config import settings

logger = logging.getLogger(__name__)
RESEND_URL = "https://api.resend.com/emails"
FROM_ADDRESS = "Crowe Keystone <noreply@crowe-keystone.app>"


async def _send(to: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        logger.info(f"[EMAIL DEV] To: {to} | Subject: {subject}")
        return True
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": FROM_ADDRESS, "to": to, "subject": subject, "html": html},
                timeout=10.0,
            )
            resp.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send to {to}: {e}")
        return False


async def send_invitation_email(
    to_email: str, invited_by_name: str, team_name: str, invite_token: str, role: str,
) -> bool:
    invite_url = f"{settings.FRONTEND_URL}/auth/register?token={invite_token}"
    role_label = role.capitalize()
    html = f"""<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#f8f9fc;border-radius:12px;">
      <div style="background:#011E41;border-radius:10px;padding:24px;margin-bottom:24px;text-align:center;">
        <h1 style="color:#F5A800;font-size:24px;margin:0;font-weight:700;">Crowe Keystone</h1>
      </div>
      <h2 style="color:#2d3142;font-size:20px;margin:0 0 12px;">You have been invited</h2>
      <p style="color:#545968;font-size:15px;line-height:1.6;margin:0 0 24px;">
        <strong>{invited_by_name}</strong> has invited you to join <strong>{team_name}</strong> as a <strong>{role_label}</strong>.
      </p>
      <a href="{invite_url}" style="display:inline-block;background:#F5A800;color:#011E41;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">
        Accept Invitation
      </a>
      <p style="color:#8b90a0;font-size:12px;margin:24px 0 0;">Expires in 7 days.</p>
    </div>"""
    return await _send(to_email, f"You have been invited to {team_name} on Crowe Keystone", html)


async def send_welcome_email(to_email: str, user_name: str, team_name: str) -> bool:
    html = f"""<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#f8f9fc;border-radius:12px;">
      <div style="background:#011E41;border-radius:10px;padding:24px;margin-bottom:24px;text-align:center;">
        <h1 style="color:#F5A800;font-size:24px;margin:0;font-weight:700;">Crowe Keystone</h1>
      </div>
      <h2 style="color:#2d3142;font-size:20px;margin:0 0 12px;">Welcome, {user_name}</h2>
      <p style="color:#545968;font-size:15px;line-height:1.6;">Your account for <strong>{team_name}</strong> is ready.</p>
      <a href="{settings.FRONTEND_URL}" style="display:inline-block;background:#F5A800;color:#011E41;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-top:24px;">
        Open Keystone
      </a>
    </div>"""
    return await _send(to_email, "Welcome to Crowe Keystone", html)
