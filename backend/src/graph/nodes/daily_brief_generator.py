from pathlib import Path
import json
from openai import AsyncOpenAI
from src.state import KeystoneState


async def daily_brief_generator_node(state: KeystoneState) -> dict:
    """Generates daily brief content from gathered data."""
    try:
        brief_sections = state.get('brief_sections', {})

        # For Phase 5, construct a simple structured brief without LLM
        # Phase 6 will wire the full LLM-generated prose version
        content = {
            'active_work': brief_sections.get('active_projects', []),
            'waiting_on_you': brief_sections.get('pending_approvals', []),
            'team_activity': brief_sections.get('team_activity', []),
            'upcoming': brief_sections.get('upcoming', []),
        }

        return {
            'brief_sections': content,
            'status': 'complete',
        }
    except Exception as e:
        return {'errors': [*state.get('errors', []), f'daily_brief_generator failed: {str(e)}']}
