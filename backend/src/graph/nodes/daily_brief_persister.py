from pathlib import Path
import json
from datetime import date
from openai import AsyncOpenAI
from src.state import KeystoneState


async def daily_brief_persister_node(state: KeystoneState) -> dict:
    """Saves daily brief to daily_briefs table. Phase 7 full implementation."""
    # Stub — Phase 7 adds the daily_briefs table and persists here
    return {'status': 'complete'}


async def daily_brief_notifier_node(state: KeystoneState) -> dict:
    """Sends push notification when brief is ready."""
    try:
        from src.routers.stream import broadcast_to_team
        await broadcast_to_team(state.get('team_id', ''), {
            'type': 'daily_brief.ready',
            'data': {'user_id': state.get('user_id'), 'date': str(date.today())}
        })
    except Exception:
        pass
    return {}
