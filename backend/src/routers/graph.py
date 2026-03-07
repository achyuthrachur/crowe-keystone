"""
Graph router — GET /graph

Returns the full portfolio graph as ReactFlow-compatible nodes and edges.
One node per non-archived project (belonging to the current user's team).
Edges are derived from open conflicts in the conflicts table.

Positions are set to {x: 0, y: 0} — the frontend dagre layout handles
real positioning.

Caching:
  Results are cached in memory for 10 seconds per team.
  The cache is invalidated by calling invalidate_graph_cache(), which is
  called by the projects router after any mutation (create, update, advance,
  archive). The cache is keyed by team_id so different teams never share data.
"""

import logging
import time
import uuid

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.conflict import Conflict
from src.models.project import Project
from src.models.user import User
from src.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["graph"])

# ---------------------------------------------------------------------------
# In-memory cache — keyed by team_id (str).
# Structure: { team_id_str: {"data": <payload>, "timestamp": float} }
# ---------------------------------------------------------------------------
_graph_cache: dict[str, dict] = {}

_CACHE_TTL_SECONDS = 10


def invalidate_graph_cache(team_id: uuid.UUID | str | None = None) -> None:
    """Invalidate the cached graph payload.

    If team_id is provided, only that team's entry is evicted.
    If team_id is None, the entire cache is cleared (useful for broad
    invalidations such as a conflict status change that affects all teams).
    """
    if team_id is None:
        _graph_cache.clear()
        logger.debug("Graph cache cleared (all teams)")
    else:
        key = str(team_id)
        if key in _graph_cache:
            del _graph_cache[key]
            logger.debug("Graph cache invalidated for team %s", key)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class NodePosition(BaseModel):
    x: float
    y: float


class NodeData(BaseModel):
    id: str
    title: str
    stage: str
    assigned_to: str | None
    stack: list[str]
    has_conflicts: bool
    is_agent_active: bool
    effort_estimate: str | None
    updated_at: str


class ReactFlowNode(BaseModel):
    id: str
    type: str
    position: NodePosition
    data: NodeData


class ConflictEdgeData(BaseModel):
    conflict_id: str
    severity: str


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    data: ConflictEdgeData
    animated: bool


class GraphResponse(BaseModel):
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=GraphResponse,
    status_code=status.HTTP_200_OK,
    summary="Return portfolio graph nodes and edges for the current user's team",
)
async def get_graph(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GraphResponse:
    """Return the full portfolio graph.

    Nodes: one per non-archived project belonging to the team.
    Edges: one per open conflict linking two projects in the team.

    The result is cached in memory for 10 seconds per team and invalidated
    whenever a project or conflict changes (via invalidate_graph_cache()).
    """
    if current_user.team_id is None:
        return GraphResponse(nodes=[], edges=[])

    team_id = current_user.team_id
    cache_key = str(team_id)

    # Return cached payload if still fresh.
    cached = _graph_cache.get(cache_key)
    if cached is not None and (time.time() - cached["timestamp"]) < _CACHE_TTL_SECONDS:
        logger.debug("Graph cache HIT for team %s", cache_key)
        return cached["data"]

    logger.debug("Graph cache MISS for team %s — building payload", cache_key)

    # ------------------------------------------------------------------
    # Query 1: all non-archived projects for this team.
    # ------------------------------------------------------------------
    projects_result = await db.execute(
        select(Project)
        .where(Project.team_id == team_id, Project.archived.is_(False))
        .order_by(Project.updated_at.desc())
    )
    projects: list[Project] = list(projects_result.scalars().all())

    # ------------------------------------------------------------------
    # Query 2: all open conflicts for this team.
    # ------------------------------------------------------------------
    conflicts_result = await db.execute(
        select(Conflict).where(
            Conflict.team_id == team_id,
            Conflict.status == "open",
        )
    )
    open_conflicts: list[Conflict] = list(conflicts_result.scalars().all())

    # Build a set of project IDs that have at least one open conflict so
    # we can mark has_conflicts on each node in O(1).
    conflicted_project_ids: set[uuid.UUID] = set()
    for conflict in open_conflicts:
        if conflict.project_a_id is not None:
            conflicted_project_ids.add(conflict.project_a_id)
        if conflict.project_b_id is not None:
            conflicted_project_ids.add(conflict.project_b_id)

    # ------------------------------------------------------------------
    # Build nodes
    # ------------------------------------------------------------------
    nodes: list[ReactFlowNode] = []
    for project in projects:
        nodes.append(
            ReactFlowNode(
                id=str(project.id),
                type="project",
                position=NodePosition(x=0, y=0),
                data=NodeData(
                    id=str(project.id),
                    title=project.title,
                    stage=project.stage,
                    assigned_to=str(project.assigned_to) if project.assigned_to is not None else None,
                    stack=list(project.stack) if project.stack is not None else [],
                    has_conflicts=project.id in conflicted_project_ids,
                    # Phase 4: agent integration not yet wired — always False.
                    # Phase 5 will update this field via the agent_runs table.
                    is_agent_active=False,
                    effort_estimate=project.effort_estimate,
                    updated_at=project.updated_at.isoformat(),
                ),
            )
        )

    # ------------------------------------------------------------------
    # Build edges — one per open conflict that links two projects.
    # Conflicts that are missing either project reference are skipped.
    # ------------------------------------------------------------------
    edges: list[ReactFlowEdge] = []
    for conflict in open_conflicts:
        if conflict.project_a_id is None or conflict.project_b_id is None:
            # Cannot draw an edge without both endpoints.
            continue
        edges.append(
            ReactFlowEdge(
                id=f"conflict-{conflict.id}",
                source=str(conflict.project_a_id),
                target=str(conflict.project_b_id),
                type="conflict",
                data=ConflictEdgeData(
                    conflict_id=str(conflict.id),
                    severity=conflict.severity,
                ),
                animated=False,
            )
        )

    payload = GraphResponse(nodes=nodes, edges=edges)

    # Store in cache.
    _graph_cache[cache_key] = {"data": payload, "timestamp": time.time()}

    return payload
