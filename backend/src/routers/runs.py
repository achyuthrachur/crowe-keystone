"""
runs.py — pipeline start and HITL gate endpoints.
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.engagement import Engagement
from src.models.keystone_run import KeystoneRun
from src.models.uploaded_document import UploadedDocument
from src.models.user import User
from src.routers.auth import get_current_user
from src.routers.stream import broadcast_to_team
from src.schemas.runs import (
    StartRunResponse, RunStatusResponse,
    Gate1ReviewRequest, Gate2ReviewRequest, Gate3ReviewRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/engagements", tags=["runs"])


# ── Background graph tasks ────────────────────────────────────────────────────

# Maps the node that the graph interrupts *before* → the engagement status to set.
_INTERRUPT_STATUS: dict[str, str] = {
    "research_agent":    "awaiting_review_1",
    "content_extractor": "awaiting_review_2",
    "brief_compiler":    "awaiting_review_3",
}


async def _settle_graph(
    engagement_id: str,
    team_id: str,
    run_id: str,
    old_status: str,
) -> None:
    """After astream finishes, inspect the graph checkpoint and write the
    correct engagement + run status to the DB and broadcast the SSE event.

    Called by both _invoke_graph (after initial run) and _resume_graph (after
    gate resume).  Never raises — logs errors instead.
    """
    from src.graph.keystone_graph import keystone_graph
    from src.database import AsyncSessionLocal
    from src.models.engagement import Engagement
    from src.models.keystone_run import KeystoneRun
    from sqlalchemy import update as sa_update
    import uuid as _uuid

    config = {"configurable": {"thread_id": run_id}}
    try:
        snapshot = await keystone_graph.aget_state(config)
    except Exception as exc:
        logger.exception("aget_state failed for run %s: %s", run_id, exc)
        snapshot = None

    if snapshot is not None and snapshot.next:
        # Graph paused at an interrupt_before node — advance to gate status.
        new_status = _INTERRUPT_STATUS.get(snapshot.next[0], "failed")
        graph_state_dict = dict(snapshot.values) if snapshot.values else {}
    elif snapshot is not None and snapshot.values.get("status") == "failed":
        new_status = "failed"
        graph_state_dict = dict(snapshot.values)
    elif snapshot is not None and not snapshot.next:
        # Graph ran to END — pipeline complete.
        new_status = "complete"
        graph_state_dict = dict(snapshot.values) if snapshot.values else {}
    else:
        new_status = "failed"
        graph_state_dict = {}

    terminal = new_status in ("complete", "failed")
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                sa_update(Engagement)
                .where(Engagement.id == _uuid.UUID(engagement_id))
                .values(status=new_status, updated_at=datetime.now(tz=timezone.utc))
            )
            run_vals: dict = {"status": new_status, "graph_state": graph_state_dict}
            if terminal:
                run_vals["completed_at"] = datetime.now(tz=timezone.utc)
            await db.execute(
                sa_update(KeystoneRun)
                .where(KeystoneRun.id == _uuid.UUID(run_id))
                .values(**run_vals)
            )
            await db.commit()
    except Exception as exc:
        logger.exception("DB update failed after graph settle (run %s): %s", run_id, exc)

    await broadcast_to_team(team_id, {
        "type": "keystone.status_changed",
        "data": {
            "engagement_id": engagement_id,
            "old_status": old_status,
            "new_status": new_status,
        },
    })


async def _invoke_graph(
    initial_state: dict,
    config: dict,
    engagement_id: str,
    team_id: str,
    run_id: str,
) -> None:
    """Run the LangGraph pipeline. Catches all exceptions — never raises."""
    from src.graph.keystone_graph import keystone_graph
    try:
        async for _ in keystone_graph.astream(initial_state, config=config):
            pass  # Node SSE broadcasts happen inside the nodes themselves
    except Exception as exc:
        logger.exception("Graph invocation failed: %s", exc)
        await broadcast_to_team(team_id, {
            "type": "keystone.status_changed",
            "data": {"engagement_id": engagement_id, "old_status": "running", "new_status": "failed"},
        })
        return
    await _settle_graph(engagement_id, team_id, run_id, "running")


async def _resume_graph(
    config: dict,
    engagement_id: str,
    team_id: str,
    run_id: str,
    old_status: str,
) -> None:
    """Resume a paused LangGraph pipeline from its checkpoint. Never raises."""
    from src.graph.keystone_graph import keystone_graph
    try:
        async for _ in keystone_graph.astream(None, config=config):
            pass
    except Exception as exc:
        logger.exception("Graph resume failed: %s", exc)
        await broadcast_to_team(team_id, {
            "type": "keystone.status_changed",
            "data": {"engagement_id": engagement_id, "old_status": old_status, "new_status": "failed"},
        })
        return
    await _settle_graph(engagement_id, team_id, run_id, old_status)


@router.post(
    "/{engagement_id}/runs",
    response_model=StartRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_run(
    engagement_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StartRunResponse:
    engagement = await _get_engagement_or_404(db, engagement_id, current_user.team_id)

    if engagement.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Engagement must be in 'ready' status to start a run (current: {engagement.status!r}).",
        )

    # Verify transcript exists
    result = await db.execute(
        select(UploadedDocument).where(
            UploadedDocument.engagement_id == engagement_id,
            UploadedDocument.doc_type == "transcript",
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcript document found. Upload a transcript before starting the pipeline.",
        )

    run = KeystoneRun(
        id=uuid.uuid4(),
        engagement_id=engagement_id,
        triggered_by=current_user.id,
        status="running",
    )
    db.add(run)
    engagement.status = "running"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(run)

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {
            "engagement_id": str(engagement_id),
            "old_status": "ready",
            "new_status": "running",
        },
    })

    # Build document storage keys for graph state
    docs_result = await db.execute(
        select(UploadedDocument).where(UploadedDocument.engagement_id == engagement_id)
    )
    docs = docs_result.scalars().all()
    transcript_doc = next((d for d in docs if d.doc_type == "transcript"), None)
    preread_doc = next((d for d in docs if d.doc_type == "preread"), None)
    agenda_doc = next((d for d in docs if d.doc_type == "agenda"), None)

    from src.state import KeystoneState
    initial_state: KeystoneState = {
        "run_id": str(run.id),
        "engagement_id": str(engagement_id),
        "team_id": str(current_user.team_id),
        "triggered_by": str(current_user.id),
        "client_name": engagement.client_name,
        "client_industry": engagement.client_industry,
        "transcript_storage_key": transcript_doc.storage_key if transcript_doc else "",
        "preread_storage_key": preread_doc.storage_key if preread_doc else None,
        "agenda_storage_key": agenda_doc.storage_key if agenda_doc else None,
        "clean_transcript": "",
        "filtered_transcript": "",
        "removed_segments": [],
        "gate1_approved": False,
        "gate1_restored_segments": [],
        "client_context_profile": {},
        "acronym_glossary": [],
        "disambiguated_transcript": "",
        "unresolved_terms": [],
        "gate2_approved": False,
        "final_glossary": [],
        "content_outline": None,
        "gate3_approved": False,
        "final_outline": None,
        "deck_brief_storage_key": None,
        "deck_handoff_storage_key": None,
        "current_node": "transcript_ingester",
        "errors": [],
        "status": "running",
    }
    config = {"configurable": {"thread_id": str(run.id)}}
    background_tasks.add_task(
        _invoke_graph, initial_state, config,
        str(engagement_id), str(current_user.team_id), str(run.id),
    )

    return StartRunResponse(
        run_id=run.id,
        engagement_id=engagement_id,
        status="running",
    )


@router.get("/{engagement_id}/runs/latest", response_model=RunStatusResponse)
async def get_latest_run(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    await _get_engagement_or_404(db, engagement_id, current_user.team_id)
    result = await db.execute(
        select(KeystoneRun)
        .where(KeystoneRun.engagement_id == engagement_id)
        .order_by(KeystoneRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No runs found for this engagement.")

    graph_state = run.graph_state or {}
    return RunStatusResponse(
        run_id=run.id,
        engagement_id=engagement_id,
        status=run.status,
        current_node=graph_state.get("current_node"),
        error=run.error,
        created_at=run.created_at,
        completed_at=run.completed_at,
        graph_state=graph_state,
    )


@router.post("/{engagement_id}/runs/latest/gate1", response_model=RunStatusResponse)
async def submit_gate1(
    engagement_id: uuid.UUID,
    payload: Gate1ReviewRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    engagement, run = await _get_engagement_and_run(db, engagement_id, current_user.team_id)
    _assert_run_status(run, "awaiting_review_1")

    graph_state = run.graph_state or {}
    graph_state["gate1_approved"] = True
    graph_state["gate1_restored_segments"] = payload.restored_segment_ids
    run.graph_state = graph_state
    run.status = "running"
    engagement.status = "running"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {"engagement_id": str(engagement_id), "old_status": "awaiting_review_1", "new_status": "running"},
    })
    await _push_gate_notification(engagement, 1, current_user.team_id, db)

    from src.graph.keystone_graph import keystone_graph
    config = {"configurable": {"thread_id": str(run.id)}}
    await keystone_graph.aupdate_state(config, {
        "gate1_approved": True,
        "gate1_restored_segments": payload.restored_segment_ids,
    })
    background_tasks.add_task(
        _resume_graph, config,
        str(engagement_id), str(current_user.team_id), str(run.id), "running",
    )

    return RunStatusResponse(
        run_id=run.id, engagement_id=engagement_id,
        status=run.status, current_node=graph_state.get("current_node"),
        error=run.error, created_at=run.created_at, completed_at=run.completed_at,
    )


@router.post("/{engagement_id}/runs/latest/gate2", response_model=RunStatusResponse)
async def submit_gate2(
    engagement_id: uuid.UUID,
    payload: Gate2ReviewRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    engagement, run = await _get_engagement_and_run(db, engagement_id, current_user.team_id)
    _assert_run_status(run, "awaiting_review_2")

    graph_state = run.graph_state or {}
    graph_state["gate2_approved"] = True
    graph_state["final_glossary"] = [g.model_dump() for g in payload.glossary]
    run.graph_state = graph_state
    run.status = "running"
    engagement.status = "running"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {"engagement_id": str(engagement_id), "old_status": "awaiting_review_2", "new_status": "running"},
    })
    await _push_gate_notification(engagement, 2, current_user.team_id, db)

    from src.graph.keystone_graph import keystone_graph
    config = {"configurable": {"thread_id": str(run.id)}}
    await keystone_graph.aupdate_state(config, {
        "gate2_approved": True,
        "final_glossary": [g.model_dump() for g in payload.glossary],
    })
    background_tasks.add_task(
        _resume_graph, config,
        str(engagement_id), str(current_user.team_id), str(run.id), "running",
    )

    return RunStatusResponse(
        run_id=run.id, engagement_id=engagement_id,
        status=run.status, current_node=graph_state.get("current_node"),
        error=run.error, created_at=run.created_at, completed_at=run.completed_at,
    )


@router.post("/{engagement_id}/runs/latest/gate3", response_model=RunStatusResponse)
async def submit_gate3(
    engagement_id: uuid.UUID,
    payload: Gate3ReviewRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RunStatusResponse:
    engagement, run = await _get_engagement_and_run(db, engagement_id, current_user.team_id)
    _assert_run_status(run, "awaiting_review_3")

    graph_state = run.graph_state or {}
    graph_state["gate3_approved"] = True
    graph_state["final_outline"] = payload.outline.model_dump()
    run.graph_state = graph_state
    run.status = "compiling"
    engagement.status = "compiling"
    engagement.updated_at = datetime.now(tz=timezone.utc)
    await db.commit()

    await broadcast_to_team(str(current_user.team_id), {
        "type": "keystone.status_changed",
        "data": {"engagement_id": str(engagement_id), "old_status": "awaiting_review_3", "new_status": "compiling"},
    })
    await _push_gate_notification(engagement, 3, current_user.team_id, db)

    from src.graph.keystone_graph import keystone_graph
    config = {"configurable": {"thread_id": str(run.id)}}
    await keystone_graph.aupdate_state(config, {
        "gate3_approved": True,
        "final_outline": payload.outline.model_dump(),
    })
    background_tasks.add_task(
        _resume_graph, config,
        str(engagement_id), str(current_user.team_id), str(run.id), "compiling",
    )

    return RunStatusResponse(
        run_id=run.id, engagement_id=engagement_id,
        status=run.status, current_node=graph_state.get("current_node"),
        error=run.error, created_at=run.created_at, completed_at=run.completed_at,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_engagement_or_404(
    db: AsyncSession, engagement_id: uuid.UUID, team_id: uuid.UUID
) -> Engagement:
    result = await db.execute(
        select(Engagement).where(
            Engagement.id == engagement_id, Engagement.team_id == team_id
        )
    )
    e = result.scalar_one_or_none()
    if e is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engagement not found.")
    return e


async def _get_engagement_and_run(
    db: AsyncSession, engagement_id: uuid.UUID, team_id: uuid.UUID
) -> tuple[Engagement, KeystoneRun]:
    engagement = await _get_engagement_or_404(db, engagement_id, team_id)
    result = await db.execute(
        select(KeystoneRun)
        .where(KeystoneRun.engagement_id == engagement_id)
        .order_by(KeystoneRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No runs found.")
    return engagement, run


def _assert_run_status(run: KeystoneRun, expected: str) -> None:
    if run.status != expected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Run must be in '{expected}' status (current: {run.status!r}).",
        )


async def _push_gate_notification(
    engagement: Engagement, gate_num: int, team_id: uuid.UUID, db: AsyncSession
) -> None:
    """Send web push notification to all team members that a gate is ready."""
    try:
        from src.models.push_subscription import PushSubscription
        from src.services import push_service

        result = await db.execute(
            select(PushSubscription).where(PushSubscription.team_id == team_id)
        )
        subscriptions = result.scalars().all()
        for sub in subscriptions:
            push_service.send_web_push(
                {
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                {
                    "title": f"Keystone — Gate {gate_num} Ready",
                    "body": f"{engagement.client_name} — Gate {gate_num} is ready for review.",
                },
            )
    except Exception as exc:
        logger.warning("Gate push notification failed (non-fatal): %s", exc)
