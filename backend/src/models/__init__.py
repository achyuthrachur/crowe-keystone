# Import all models so Alembic autogenerate can discover them via Base.metadata.
# The order matters: referenced tables must be imported before referencing tables.

from src.models.team import Team  # noqa: F401
from src.models.user import User  # noqa: F401
from src.models.project import Project  # noqa: F401
from src.models.agent_run import AgentRun  # noqa: F401
from src.models.push_subscription import PushSubscription  # noqa: F401
from src.models.approval import Approval  # noqa: F401
from src.models.conflict import Conflict  # noqa: F401

__all__ = [
    "Team",
    "User",
    "Project",
    "AgentRun",
    "PushSubscription",
    "Approval",
    "Conflict",
]
