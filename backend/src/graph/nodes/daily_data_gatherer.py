from pathlib import Path
import json
from openai import AsyncOpenAI
from src.state import KeystoneState


async def daily_data_gatherer_node(state: KeystoneState) -> dict:
    """Gathers data for daily brief from database."""
    try:
        from sqlalchemy import select, and_
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from src.config import settings
        from src.database import _build_asyncpg_url, _ssl_context
        from src.models.project import Project
        from src.models.approval import Approval

        engine = create_async_engine(
            _build_asyncpg_url(settings.DATABASE_URL), echo=False,
            connect_args={"ssl": _ssl_context}
        )
        factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

        user_id = state.get('user_id')
        team_id = state.get('team_id')

        async with factory() as db:
            # Projects assigned to user
            result = await db.execute(
                select(Project).where(
                    Project.team_id == __import__('uuid').UUID(team_id),
                    Project.archived == False,
                    Project.stage.notin_(['shipped', 'retrospective'])
                ).order_by(Project.updated_at.desc()).limit(10)
            )
            projects = result.scalars().all()

            # Pending approvals for user
            result2 = await db.execute(
                select(Approval).where(
                    Approval.status == 'pending',
                    Approval.assigned_to.contains([str(user_id)] if user_id else [])
                ).limit(5)
            )
            approvals = result2.scalars().all()

        await engine.dispose()

        return {
            'brief_sections': {
                'active_projects': [{'id': str(p.id), 'title': p.title, 'stage': p.stage} for p in projects],
                'pending_approvals': [{'id': str(a.id), 'type': a.type} for a in approvals],
                'team_activity': [],
                'upcoming': [],
            }
        }
    except Exception as e:
        return {'errors': [*state.get('errors', []), f'daily_data_gatherer failed: {str(e)}']}
