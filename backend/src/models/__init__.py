# Import all models so Alembic autogenerate can discover them via Base.metadata.
# The order matters: referenced tables must be imported before referencing tables.

from src.models.team import Team  # noqa: F401
from src.models.user import User  # noqa: F401
from src.models.agent_run import AgentRun  # noqa: F401
from src.models.push_subscription import PushSubscription  # noqa: F401
from src.models.engagement import Engagement  # noqa: F401
from src.models.uploaded_document import UploadedDocument  # noqa: F401
from src.models.keystone_run import KeystoneRun  # noqa: F401
from src.models.acronym_glossary import AcronymGlossary  # noqa: F401

__all__ = [
    "Team",
    "User",
    "AgentRun",
    "PushSubscription",
    "Engagement",
    "UploadedDocument",
    "KeystoneRun",
    "AcronymGlossary",
]
