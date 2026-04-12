# Keystone — PRD Phase B: Data Layer
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase A HANDOFF.md reports 7 passed / 0 failed, typecheck pass, build pass

---

## Overview

Phase B defines every data structure the application touches. Nothing in Phase C
(agent pipeline) or Phase D (UI) gets written until this phase passes clean.

Phase B deliverables:
1. `backend/src/state.py` — full replacement with `KeystoneState` TypedDict
2. `backend/src/models/engagement.py` — new SQLAlchemy model
3. `backend/src/models/uploaded_document.py` — new SQLAlchemy model
4. `backend/src/models/keystone_run.py` — new SQLAlchemy model
5. `backend/src/models/acronym_glossary.py` — new SQLAlchemy model
6. `backend/src/models/__init__.py` — updated with 4 new model imports
7. `backend/alembic/versions/003_keystone.py` — migration with upgrade() and downgrade()
8. `backend/src/schemas/` — Pydantic request/response schemas for all 4 new routers
9. `backend/src/services/file_storage.py` — env-aware file storage implementation
10. `backend/src/services/synthetic_guard.py` — data policy enforcement
11. `backend/src/services/synthetic_guard_blocklist.txt` — empty file, manually maintained
12. `backend/scripts/seed_synthetic.py` — synthetic data for test environment
13. `backend/src/routers/agents.py` — update initial_state to use new KeystoneState shape
14. `backend/src/config.py` — remove stale Keystone fields, fix container name

---

## 1. Config Cleanup

Before any new files, fix two stale items in `backend/src/config.py`:

**Remove these fields entirely** (leftover from old Keystone, unused):
```python
CONFLICT_THRESHOLD: float = 0.75
GITHUB_WEBHOOK_SECRET: str = ""
RESEND_API_KEY: str = ""
REGISTRATION_MODE: str = "open"
```

**Fix this field** (wrong name from old draft):
```python
# CHANGE this:
AZURE_STORAGE_CONTAINER: str = "debrief-uploads"
# TO this:
AZURE_STORAGE_CONTAINER: str = "keystone-uploads"
```

**Also fix the comment block** above FILE_STORAGE_BACKEND:
```python
# File storage backend: local | azure_blob | supabase
# local:       writes to /tmp/keystone-uploads/ (development only)
# azure_blob:  Azure Blob Storage (production)
# supabase:    Supabase Storage (test)
FILE_STORAGE_BACKEND: str = "local"
```

---

## 2. State — backend/src/state.py

**Full replacement.** Delete all existing content. Write exactly this:

```python
# backend/src/state.py
# REPLACE ENTIRELY in Phase B.
# This file defines the LangGraph state for the Keystone transcript pipeline.
# Nodes return a DICT with only the fields they modify — not the full state.
# Annotated[list, operator.add] fields are automatically merged across parallel branches.

import operator
from typing import Annotated, Optional, TypedDict


# ---------------------------------------------------------------------------
# Support TypedDicts — used as field types within KeystoneState
# ---------------------------------------------------------------------------

class RemovedSegment(TypedDict):
    id: str                    # uuid4 string, assigned by noise_filter
    text: str                  # the removed text block
    reason: str                # off_topic | personal_chatter | other_workstream | admin


class AcronymEntry(TypedDict):
    term: str                  # e.g. "P&C"
    expansion: str             # e.g. "Property & Casualty"
    confidence: float          # 0.0–1.0, from research_agent
    source: str                # web_search | inferred | user_edited


class OutlineItem(TypedDict):
    id: str                    # uuid4 string, assigned by content_extractor
    text: str                  # the finding or recommendation text
    source_quote: str          # verbatim snippet from disambiguated_transcript
    slide_type_hint: Optional[str]  # user-added hint, e.g. "bullet list", "stat callout"


class ContentOutline(TypedDict):
    key_themes: list[OutlineItem]
    pain_points: list[OutlineItem]
    stated_priorities: list[OutlineItem]
    open_questions: list[OutlineItem]
    potential_recommendations: list[OutlineItem]
    suggested_next_steps: list[OutlineItem]


# ---------------------------------------------------------------------------
# KeystoneState — the single state object passed through the LangGraph graph
# ---------------------------------------------------------------------------

class KeystoneState(TypedDict):
    # ── Identity ─────────────────────────────────────────────────────────────
    run_id: str                # matches KeystoneRun.id
    engagement_id: str         # matches Engagement.id
    team_id: str
    triggered_by: str          # user_id

    # ── Engagement metadata (copied in at run start, not re-fetched by nodes)
    client_name: str
    client_industry: str

    # ── Uploaded document storage keys (set by runs router before graph starts)
    transcript_storage_key: str           # required
    preread_storage_key: Optional[str]    # optional
    agenda_storage_key: Optional[str]     # optional

    # ── Node 1 output — transcript_ingester ──────────────────────────────────
    clean_transcript: str                 # normalized plain text

    # ── Node 2 output — noise_filter ─────────────────────────────────────────
    filtered_transcript: str
    removed_segments: list[RemovedSegment]

    # ── HITL Gate 1 — set by runs router when user submits review ────────────
    gate1_approved: bool
    gate1_restored_segments: list[str]    # list of RemovedSegment.id strings

    # ── Node 3 output — research_agent ───────────────────────────────────────
    client_context_profile: dict          # free-form JSON, see Phase C for exact shape
    acronym_glossary: list[AcronymEntry]

    # ── Node 4 output — disambiguator ────────────────────────────────────────
    disambiguated_transcript: str
    unresolved_terms: list[str]           # terms the disambiguator could not resolve

    # ── HITL Gate 2 — set by runs router when user submits glossary ──────────
    gate2_approved: bool
    final_glossary: list[AcronymEntry]    # user-edited version of acronym_glossary

    # ── Node 5 output — content_extractor ────────────────────────────────────
    content_outline: Optional[ContentOutline]

    # ── HITL Gate 3 — set by runs router when user submits outline ───────────
    gate3_approved: bool
    final_outline: Optional[ContentOutline]  # user-edited version of content_outline

    # ── Node 6 output — brief_compiler ───────────────────────────────────────
    deck_brief_storage_key: Optional[str]    # storage key for .docx
    deck_handoff_storage_key: Optional[str]  # storage key for .json

    # ── Control flow ─────────────────────────────────────────────────────────
    current_node: str          # name of the node currently executing
    errors: Annotated[list[str], operator.add]
    status: str
    # running | awaiting_review_1 | awaiting_review_2 | awaiting_review_3
    # | compiling | complete | failed
```

---

## 3. SQLAlchemy Models

### 3.1 backend/src/models/engagement.py

```python
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Engagement(Base):
    __tablename__ = "engagements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    client_name: Mapped[str] = mapped_column(Text, nullable=False)
    client_industry: Mapped[str] = mapped_column(Text, nullable=False)
    engagement_date: Mapped[date] = mapped_column(Date, nullable=False)
    attendees: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Status values:
    # draft | uploading | ready | running | awaiting_review_1 | awaiting_review_2
    # | awaiting_review_3 | compiling | complete | failed
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="draft", default="draft"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def __repr__(self) -> str:
        return f"<Engagement id={self.id} client={self.client_name!r} status={self.status!r}>"
```

### 3.2 backend/src/models/uploaded_document.py

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # doc_type values: transcript | preread | agenda
    doc_type: Mapped[str] = mapped_column(Text, nullable=False)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    # storage_key: opaque string returned by file_storage.store_upload()
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # parsed_text: normalized plain text set by transcript_ingester node
    parsed_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<UploadedDocument id={self.id} type={self.doc_type!r} file={self.original_filename!r}>"
```

### 3.3 backend/src/models/keystone_run.py

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class KeystoneRun(Base):
    __tablename__ = "keystone_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Status values:
    # running | awaiting_review_1 | awaiting_review_2 | awaiting_review_3
    # | compiling | complete | failed
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="running", default="running"
    )
    # Full KeystoneState snapshot — updated on every status transition
    graph_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Storage keys for generated output files
    deck_brief_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    deck_handoff_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<KeystoneRun id={self.id} engagement={self.engagement_id} status={self.status!r}>"
```

### 3.4 backend/src/models/acronym_glossary.py

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class AcronymGlossary(Base):
    __tablename__ = "acronym_glossary"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    term: Mapped[str] = mapped_column(Text, nullable=False)
    expansion: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="1.0", default=1.0
    )
    # source values: web_search | inferred | user_edited
    source: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="web_search", default="web_search"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def __repr__(self) -> str:
        return f"<AcronymGlossary id={self.id} term={self.term!r} expansion={self.expansion!r}>"
```

### 3.5 Update backend/src/models/__init__.py

Replace the entire file with:

```python
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
```

---

## 4. Alembic Migration — backend/alembic/versions/003_keystone.py

```python
"""003_keystone — drop old Keystone tables, create Debrief pipeline tables

Revision ID: 003_keystone
Revises: 002_phase2
Create Date: 2026-03-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003_keystone"
down_revision = "002_phase2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Drop old Keystone tables (dependency order matters) ───────────────────
    # invitations references users
    op.drop_table("invitations", if_exists=True)
    # retrospectives references projects + users
    op.drop_table("retrospectives", if_exists=True)
    # decisions references projects + users
    op.drop_table("decisions", if_exists=True)
    # approvals references projects + users
    op.drop_table("approvals", if_exists=True)
    # conflicts references projects
    op.drop_table("conflicts", if_exists=True)
    # prds references projects
    op.drop_table("prds", if_exists=True)
    # agent_run_logs references agent_runs (if exists)
    op.drop_table("agent_run_logs", if_exists=True)
    # projects references teams + users
    op.drop_table("projects", if_exists=True)

    # ── Create engagements ───────────────────────────────────────────────────
    op.create_table(
        "engagements",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "team_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("teams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("client_name", sa.Text, nullable=False),
        sa.Column("client_industry", sa.Text, nullable=False),
        sa.Column("engagement_date", sa.Date, nullable=False),
        sa.Column("attendees", sa.Text, nullable=False, server_default=""),
        sa.Column("status", sa.Text, nullable=False, server_default="draft"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_engagements_team_id", "engagements", ["team_id"])

    # ── Create uploaded_documents ────────────────────────────────────────────
    op.create_table(
        "uploaded_documents",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("doc_type", sa.Text, nullable=False),
        sa.Column("original_filename", sa.Text, nullable=False),
        sa.Column("storage_key", sa.Text, nullable=False),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("parsed_text", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_uploaded_documents_engagement_id", "uploaded_documents", ["engagement_id"])

    # ── Create keystone_runs ─────────────────────────────────────────────────
    op.create_table(
        "keystone_runs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "triggered_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.Text, nullable=False, server_default="running"),
        sa.Column("graph_state", postgresql.JSONB, nullable=True),
        sa.Column("deck_brief_storage_key", sa.Text, nullable=True),
        sa.Column("deck_handoff_storage_key", sa.Text, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_keystone_runs_engagement_id", "keystone_runs", ["engagement_id"])

    # ── Create acronym_glossary ──────────────────────────────────────────────
    op.create_table(
        "acronym_glossary",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engagements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("term", sa.Text, nullable=False),
        sa.Column("expansion", sa.Text, nullable=False),
        sa.Column("confidence", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("source", sa.Text, nullable=False, server_default="web_search"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_acronym_glossary_engagement_id", "acronym_glossary", ["engagement_id"])


def downgrade() -> None:
    # ── Drop new tables (reverse dependency order) ────────────────────────────
    op.drop_index("ix_acronym_glossary_engagement_id", table_name="acronym_glossary")
    op.drop_table("acronym_glossary")

    op.drop_index("ix_keystone_runs_engagement_id", table_name="keystone_runs")
    op.drop_table("keystone_runs")

    op.drop_index("ix_uploaded_documents_engagement_id", table_name="uploaded_documents")
    op.drop_table("uploaded_documents")

    op.drop_index("ix_engagements_team_id", table_name="engagements")
    op.drop_table("engagements")

    # ── Recreate old Keystone tables (bare structure — data is not preserved) ─
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("stage", sa.Text, nullable=False, server_default="spark"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "prds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("content", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "conflicts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("status", sa.Text, nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "approvals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Text, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "retrospectives",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
```

---

## 5. Pydantic Schemas — backend/src/schemas/

Create the `backend/src/schemas/` directory if it does not exist.
Create `backend/src/schemas/__init__.py` as an empty file.

### 5.1 backend/src/schemas/engagement.py

```python
from datetime import date, datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class EngagementCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    client_industry: str = Field(..., min_length=1, max_length=200)
    engagement_date: date
    attendees: str = Field(default="", max_length=2000)


class EngagementUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_industry: Optional[str] = Field(None, min_length=1, max_length=200)
    engagement_date: Optional[date] = None
    attendees: Optional[str] = Field(None, max_length=2000)


class EngagementResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    created_by: Optional[uuid.UUID]
    client_name: str
    client_industry: str
    engagement_date: date
    attendees: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EngagementListResponse(BaseModel):
    engagements: list[EngagementResponse]
    total: int
```

### 5.2 backend/src/schemas/upload.py

```python
from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel


class UploadedDocumentResponse(BaseModel):
    id: uuid.UUID
    engagement_id: uuid.UUID
    doc_type: str
    original_filename: str
    storage_key: str
    file_size_bytes: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
```

### 5.3 backend/src/schemas/runs.py

```python
from datetime import datetime
from typing import Optional, Any
import uuid

from pydantic import BaseModel


class StartRunResponse(BaseModel):
    run_id: uuid.UUID
    engagement_id: uuid.UUID
    status: str


class RunStatusResponse(BaseModel):
    run_id: uuid.UUID
    engagement_id: uuid.UUID
    status: str
    current_node: Optional[str]
    error: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# HITL Gate review request bodies

class Gate1ReviewRequest(BaseModel):
    """User submits which removed_segment IDs to restore."""
    restored_segment_ids: list[str] = []  # list of RemovedSegment.id strings


class AcronymEntryInput(BaseModel):
    term: str
    expansion: str


class Gate2ReviewRequest(BaseModel):
    """User submits the approved + edited glossary."""
    glossary: list[AcronymEntryInput]


class OutlineItemInput(BaseModel):
    id: str
    text: str
    source_quote: str
    slide_type_hint: Optional[str] = None


class ContentOutlineInput(BaseModel):
    key_themes: list[OutlineItemInput] = []
    pain_points: list[OutlineItemInput] = []
    stated_priorities: list[OutlineItemInput] = []
    open_questions: list[OutlineItemInput] = []
    potential_recommendations: list[OutlineItemInput] = []
    suggested_next_steps: list[OutlineItemInput] = []


class Gate3ReviewRequest(BaseModel):
    """User submits the finalized content outline."""
    outline: ContentOutlineInput
```

### 5.4 backend/src/schemas/output.py

```python
from pydantic import BaseModel


class OutputFilesResponse(BaseModel):
    """Returned by GET /engagements/{id}/output to confirm files are available."""
    engagement_id: str
    deck_brief_available: bool
    deck_handoff_available: bool
    deck_brief_download_url: str   # /api/v1/output/{engagement_id}/brief
    deck_handoff_download_url: str # /api/v1/output/{engagement_id}/handoff
```

---

## 6. JSON Deck Handoff Schema

This is the exact structure of `deck_handoff.json` — the file Claude Code reads
to start building a presentation. The `brief_compiler` node must produce
a JSON file that validates against this structure.

Document this as a comment block at the top of `backend/src/services/json_builder.py`:

```python
"""
Deck Handoff JSON Schema — v1.0

This is the exact structure of deck_handoff.json.
Claude Code reads this file at the start of a deck generation session.

{
  "schema_version": "1.0",
  "generated_at": "<ISO datetime>",

  "engagement": {
    "client_name": "Nationwide Insurance",
    "client_industry": "Property & Casualty Insurance",
    "engagement_date": "2025-03-20",
    "attendees": "CRO, Head of Model Risk, BSA Lead",
    "run_id": "<uuid>"
  },

  "client_context": {
    "summary": "<2-3 sentence overview of the organization>",
    "key_facts": ["<fact 1>", "<fact 2>"],
    "regulatory_environment": "<brief description of relevant regulatory context>",
    "recent_news": ["<headline or development 1>", "<headline 2>"]
  },

  "acronym_glossary": [
    {"term": "P&C", "expansion": "Property & Casualty"},
    {"term": "MRM", "expansion": "Model Risk Management"}
  ],

  "content_outline": {
    "key_themes": [
      {
        "id": "kt-1",
        "text": "<the finding or theme>",
        "source_quote": "<verbatim snippet from transcript>",
        "slide_type_hint": "<optional: bullet list | stat callout | two-column | timeline>"
      }
    ],
    "pain_points": [ ... same structure ... ],
    "stated_priorities": [ ... same structure ... ],
    "open_questions": [ ... same structure ... ],
    "potential_recommendations": [ ... same structure ... ],
    "suggested_next_steps": [ ... same structure ... ]
  },

  "deck_instructions": {
    "suggested_slide_count": 12,
    "suggested_sections": [
      {
        "title": "Executive Summary",
        "content_ids": ["kt-1", "kt-2", "pp-1"]
      }
    ],
    "tone": "executive briefing",
    "branding": "Crowe standard"
  }
}
"""
```

The `json_builder.py` service assembles this from the final `KeystoneState`
after Gate 3 is approved. The `brief_compiler` node calls it.

---

## 7. File Storage Service — backend/src/services/file_storage.py

```python
"""
file_storage.py — environment-aware file storage service.

All file I/O in the application goes through this module.
Nothing in routers or nodes touches storage backends directly.

Backend is controlled by settings.FILE_STORAGE_BACKEND:
  local       → /tmp/keystone-uploads/[engagement_id]/[filename]
  supabase    → Supabase Storage, bucket: keystone-uploads
  azure_blob  → Azure Blob Storage, container: keystone-uploads

storage_key format (same for all backends):
  "[engagement_id]/[filename]"
  Exception: local backend uses absolute path as storage_key.
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


async def store_upload(file_bytes: bytes, filename: str, engagement_id: str) -> str:
    """
    Store an uploaded file. Returns storage_key.
    storage_key is an opaque string stored on UploadedDocument.storage_key
    and passed back to retrieve_upload() to get the bytes.
    """
    from src.config import settings

    if settings.FILE_STORAGE_BACKEND == "local":
        return await _local_store(file_bytes, filename, engagement_id, "uploads")

    if settings.FILE_STORAGE_BACKEND == "supabase":
        return await _supabase_store(file_bytes, filename, engagement_id)

    if settings.FILE_STORAGE_BACKEND == "azure_blob":
        return await _azure_store(file_bytes, filename, engagement_id)

    raise ValueError(f"Unknown FILE_STORAGE_BACKEND: {settings.FILE_STORAGE_BACKEND!r}")


async def retrieve_upload(storage_key: str) -> bytes:
    """Retrieve raw file bytes by storage_key."""
    from src.config import settings

    if settings.FILE_STORAGE_BACKEND == "local":
        return Path(storage_key).read_bytes()

    if settings.FILE_STORAGE_BACKEND == "supabase":
        return await _supabase_retrieve(storage_key)

    if settings.FILE_STORAGE_BACKEND == "azure_blob":
        return await _azure_retrieve(storage_key)

    raise ValueError(f"Unknown FILE_STORAGE_BACKEND: {settings.FILE_STORAGE_BACKEND!r}")


async def store_output(file_bytes: bytes, filename: str, engagement_id: str) -> str:
    """Store a generated output file (.docx or .json). Returns storage_key."""
    from src.config import settings

    if settings.FILE_STORAGE_BACKEND == "local":
        return await _local_store(file_bytes, filename, engagement_id, "outputs")

    if settings.FILE_STORAGE_BACKEND == "supabase":
        return await _supabase_store(file_bytes, f"output/{filename}", engagement_id)

    if settings.FILE_STORAGE_BACKEND == "azure_blob":
        return await _azure_store(file_bytes, f"output/{filename}", engagement_id)

    raise ValueError(f"Unknown FILE_STORAGE_BACKEND: {settings.FILE_STORAGE_BACKEND!r}")


async def retrieve_output(storage_key: str) -> bytes:
    """Retrieve output file bytes by storage_key."""
    return await retrieve_upload(storage_key)  # same logic, different intent


# ---------------------------------------------------------------------------
# Local backend
# ---------------------------------------------------------------------------

async def _local_store(
    file_bytes: bytes, filename: str, engagement_id: str, subfolder: str
) -> str:
    dir_path = Path(f"/tmp/keystone-uploads/{engagement_id}/{subfolder}")
    dir_path.mkdir(parents=True, exist_ok=True)
    file_path = dir_path / filename
    file_path.write_bytes(file_bytes)
    logger.debug("local_store: wrote %d bytes to %s", len(file_bytes), file_path)
    return str(file_path)  # absolute path is the storage_key for local


# ---------------------------------------------------------------------------
# Supabase backend
# ---------------------------------------------------------------------------

async def _supabase_store(file_bytes: bytes, filename: str, engagement_id: str) -> str:
    from src.config import settings
    from supabase import create_client

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    object_path = f"{engagement_id}/{filename}"
    bucket = "keystone-uploads"

    client.storage.from_(bucket).upload(
        path=object_path,
        file=file_bytes,
        file_options={"upsert": "true"},
    )
    logger.debug("supabase_store: uploaded %d bytes to %s/%s", len(file_bytes), bucket, object_path)
    return object_path


async def _supabase_retrieve(storage_key: str) -> bytes:
    from src.config import settings
    from supabase import create_client

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    bucket = "keystone-uploads"
    response = client.storage.from_(bucket).download(storage_key)
    return response


# ---------------------------------------------------------------------------
# Azure Blob Storage backend
# ---------------------------------------------------------------------------

async def _azure_store(file_bytes: bytes, filename: str, engagement_id: str) -> str:
    from src.config import settings
    from azure.storage.blob import BlobServiceClient

    blob_name = f"{engagement_id}/{filename}"
    blob_service = BlobServiceClient.from_connection_string(
        settings.AZURE_STORAGE_CONNECTION_STRING
    )
    container_client = blob_service.get_container_client(settings.AZURE_STORAGE_CONTAINER)

    # Create container if it doesn't exist (idempotent)
    try:
        container_client.create_container()
    except Exception:
        pass  # already exists

    blob_client = container_client.get_blob_client(blob_name)
    blob_client.upload_blob(file_bytes, overwrite=True)
    logger.debug("azure_store: uploaded %d bytes to %s/%s", len(file_bytes), settings.AZURE_STORAGE_CONTAINER, blob_name)
    return blob_name


async def _azure_retrieve(storage_key: str) -> bytes:
    from src.config import settings
    from azure.storage.blob import BlobServiceClient

    blob_service = BlobServiceClient.from_connection_string(
        settings.AZURE_STORAGE_CONNECTION_STRING
    )
    blob_client = blob_service.get_blob_client(
        container=settings.AZURE_STORAGE_CONTAINER,
        blob=storage_key,
    )
    stream = blob_client.download_blob()
    return stream.readall()
```

---

## 8. Synthetic Data Guard — backend/src/services/synthetic_guard.py

```python
"""
synthetic_guard.py — data policy enforcement for non-production environments.

In test and development, this guard rejects uploads that appear to contain
real client data. In production, the guard is bypassed entirely.

Two checks:
1. client_name is not in synthetic_guard_blocklist.txt
2. file content does not contain PII patterns (SSNs, account numbers, routing numbers)
"""

import re
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Lazy-loaded blocklist
_blocklist: set[str] | None = None
_BLOCKLIST_PATH = Path(__file__).parent / "synthetic_guard_blocklist.txt"

# PII patterns — intentionally conservative
_SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_ACCOUNT_PATTERN = re.compile(r"\b\d{9,18}\b")
_ROUTING_PATTERN = re.compile(r"\b0[0-9]{8}\b")  # ABA routing numbers start with 0-3


def _load_blocklist() -> set[str]:
    global _blocklist
    if _blocklist is None:
        if _BLOCKLIST_PATH.exists():
            lines = _BLOCKLIST_PATH.read_text(encoding="utf-8").splitlines()
            _blocklist = {line.strip().lower() for line in lines if line.strip()}
        else:
            _blocklist = set()
    return _blocklist


class SyntheticGuardError(Exception):
    """Raised when real client data is detected in a non-production environment."""
    pass


def check_engagement_name(client_name: str) -> None:
    """
    Raises SyntheticGuardError if client_name matches a known real Crowe client.
    Call this when creating an engagement in non-production environments.
    """
    from src.config import settings
    if settings.is_production:
        return

    blocklist = _load_blocklist()
    if client_name.strip().lower() in blocklist:
        raise SyntheticGuardError(
            "Real client data is not permitted in the test environment. "
            "Use the production deployment for live engagements."
        )


def check_file_content(file_bytes: bytes) -> None:
    """
    Raises SyntheticGuardError if file content contains PII patterns.
    Call this on every uploaded file in non-production environments.
    Skips binary files (PDF, DOCX) — only checks plain text.
    """
    from src.config import settings
    if settings.is_production:
        return

    try:
        text = file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return  # can't decode — skip check

    if _SSN_PATTERN.search(text):
        raise SyntheticGuardError(
            "Real client data is not permitted in the test environment. "
            "Use the production deployment for live engagements."
        )

    # Account number check: only flag if combined with banking keywords
    banking_keywords = {"account", "routing", "aba", "acct", "checking", "savings"}
    text_lower = text.lower()
    has_banking_context = any(kw in text_lower for kw in banking_keywords)
    if has_banking_context and (_ACCOUNT_PATTERN.search(text) or _ROUTING_PATTERN.search(text)):
        raise SyntheticGuardError(
            "Real client data is not permitted in the test environment. "
            "Use the production deployment for live engagements."
        )
```

Create `backend/src/services/synthetic_guard_blocklist.txt` as an empty file.
Team members add real client names here manually, one per line, lowercase.

---

## 9. Seed Script — backend/scripts/seed_synthetic.py

```python
"""
seed_synthetic.py — populate the test database with synthetic engagement data.

Run against the Neon (test) database only. Never run against production.

Usage:
    cd backend
    source venv/Scripts/activate
    python scripts/seed_synthetic.py

Creates:
  - 1 team: Crowe IRM AI Team
  - 3 users (one admin, two builders)
  - 3 completed engagements with different industries
  - For each engagement: 2 uploaded documents, 1 keystone_run, glossary entries
"""

import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timezone
from pathlib import Path

# Add backend/src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ.setdefault("ENVIRONMENT", "test")

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from src.config import settings
from src.models import Team, User, Engagement, UploadedDocument, KeystoneRun, AcronymGlossary


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SYNTHETIC_ENGAGEMENTS = [
    {
        "client_name": "First Midwest Bank (Synthetic)",
        "client_industry": "Community Banking",
        "engagement_date": date(2025, 3, 15),
        "attendees": "CRO, Head of Model Risk, Internal Audit Director",
        "acronyms": [
            {"term": "CECL", "expansion": "Current Expected Credit Loss", "confidence": 0.98},
            {"term": "PD", "expansion": "Probability of Default", "confidence": 0.99},
            {"term": "LGD", "expansion": "Loss Given Default", "confidence": 0.99},
            {"term": "MRM", "expansion": "Model Risk Management", "confidence": 0.99},
        ],
    },
    {
        "client_name": "Lakefront Credit Union (Synthetic)",
        "client_industry": "Credit Union",
        "engagement_date": date(2025, 2, 28),
        "attendees": "CEO, CFO, BSA Officer, Compliance Director",
        "acronyms": [
            {"term": "BSA", "expansion": "Bank Secrecy Act", "confidence": 0.99},
            {"term": "AML", "expansion": "Anti-Money Laundering", "confidence": 0.99},
            {"term": "SAR", "expansion": "Suspicious Activity Report", "confidence": 0.99},
            {"term": "KYC", "expansion": "Know Your Customer", "confidence": 0.98},
        ],
    },
    {
        "client_name": "Tristate Insurance Group (Synthetic)",
        "client_industry": "Property & Casualty Insurance",
        "engagement_date": date(2025, 3, 5),
        "attendees": "CRO, Head of Actuarial, Chief Data Officer",
        "acronyms": [
            {"term": "P&C", "expansion": "Property & Casualty", "confidence": 0.99},
            {"term": "CAT", "expansion": "Catastrophe (modeling)", "confidence": 0.95},
            {"term": "IBNR", "expansion": "Incurred But Not Reported", "confidence": 0.98},
            {"term": "RBC", "expansion": "Risk-Based Capital", "confidence": 0.97},
        ],
    },
]

SYNTHETIC_TRANSCRIPT = """[TRANSCRIPT — SYNTHETIC DATA — NOT REAL CLIENT CONTENT]

Facilitator: Good morning everyone. Let's get started with the discovery session.
Today we're focusing on understanding your current model risk management framework.

Client Lead: Thanks for being here. As I mentioned in the pre-read, we've been
growing rapidly and our model inventory has expanded significantly over the past
two years. We're now at about forty models in production.

Facilitator: And what percentage of those have gone through full SR 11-7 compliant
validation?

Client Lead: Honestly, maybe sixty percent. The others are legacy systems that
predate our formal MRM program. That's one of the key pain points we want to address.

Risk Manager: We also have a vendor model problem. Several of our critical decision
models are black-box systems we purchased from third parties. We've struggled to
get adequate documentation from the vendors.

Facilitator: That's a common challenge. What does your current validation process
look like for vendor models?

Risk Manager: We rely heavily on the vendor's own testing documentation. We don't
have the internal capability to do independent validation of the model logic.

[END SYNTHETIC TRANSCRIPT]
"""


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # Team
        team = Team(
            id=uuid.uuid4(),
            name="Crowe IRM AI Team",
            slug="crowe-irm-ai",
        )
        db.add(team)
        await db.flush()

        # Users
        admin = User(
            id=uuid.uuid4(),
            email="achyuth@crowe-synthetic.test",
            name="Achyuth Rachur",
            team_id=team.id,
            role="admin",
            hashed_password=pwd_context.hash("synthetic-password-123"),
            email_verified=True,
        )
        builder1 = User(
            id=uuid.uuid4(),
            email="builder1@crowe-synthetic.test",
            name="Team Member One",
            team_id=team.id,
            role="builder",
            hashed_password=pwd_context.hash("synthetic-password-123"),
            email_verified=True,
        )
        builder2 = User(
            id=uuid.uuid4(),
            email="builder2@crowe-synthetic.test",
            name="Team Member Two",
            team_id=team.id,
            role="builder",
            hashed_password=pwd_context.hash("synthetic-password-123"),
            email_verified=True,
        )
        db.add_all([admin, builder1, builder2])
        await db.flush()

        for eng_data in SYNTHETIC_ENGAGEMENTS:
            # Engagement
            engagement = Engagement(
                id=uuid.uuid4(),
                team_id=team.id,
                created_by=admin.id,
                client_name=eng_data["client_name"],
                client_industry=eng_data["client_industry"],
                engagement_date=eng_data["engagement_date"],
                attendees=eng_data["attendees"],
                status="complete",
            )
            db.add(engagement)
            await db.flush()

            # Uploaded transcript document
            transcript_doc = UploadedDocument(
                id=uuid.uuid4(),
                engagement_id=engagement.id,
                uploaded_by=admin.id,
                doc_type="transcript",
                original_filename="discovery-session-transcript.txt",
                storage_key=f"{engagement.id}/transcript/discovery-session-transcript.txt",
                file_size_bytes=len(SYNTHETIC_TRANSCRIPT.encode()),
                parsed_text=SYNTHETIC_TRANSCRIPT,
            )
            db.add(transcript_doc)

            # Uploaded preread document
            preread_doc = UploadedDocument(
                id=uuid.uuid4(),
                engagement_id=engagement.id,
                uploaded_by=admin.id,
                doc_type="preread",
                original_filename="engagement-preread.pdf",
                storage_key=f"{engagement.id}/preread/engagement-preread.pdf",
                file_size_bytes=1024,
                parsed_text=f"Pre-read document for {eng_data['client_name']}. Synthetic data only.",
            )
            db.add(preread_doc)

            # Keystone run
            run = KeystoneRun(
                id=uuid.uuid4(),
                engagement_id=engagement.id,
                triggered_by=admin.id,
                status="complete",
                deck_brief_storage_key=f"{engagement.id}/output/deck_brief.docx",
                deck_handoff_storage_key=f"{engagement.id}/output/deck_handoff.json",
                completed_at=datetime.now(tz=timezone.utc),
            )
            db.add(run)

            # Acronym glossary entries
            for acronym in eng_data["acronyms"]:
                entry = AcronymGlossary(
                    id=uuid.uuid4(),
                    engagement_id=engagement.id,
                    term=acronym["term"],
                    expansion=acronym["expansion"],
                    confidence=acronym["confidence"],
                    source="web_search",
                )
                db.add(entry)

        await db.commit()
        print("Seed complete.")
        print(f"  Team: {team.name} (slug: {team.slug})")
        print(f"  Admin login: achyuth@crowe-synthetic.test / synthetic-password-123")
        print(f"  {len(SYNTHETIC_ENGAGEMENTS)} engagements seeded with status=complete")


if __name__ == "__main__":
    asyncio.run(seed())
```

---

## 10. Update agents.py — initial_state shape

In `backend/src/routers/agents.py`, the `create_agent_run` endpoint still builds
`initial_state` using the old Keystone field names. Replace the entire
`initial_state` block with the new KeystoneState shape:

```python
# ── Build initial LangGraph state ──────────────────────────────────────
initial_state: KeystoneState = {
    "run_id": run_id,
    "engagement_id": payload.input_data.get("engagement_id", ""),
    "team_id": team_id,
    "triggered_by": user_id,
    "client_name": payload.input_data.get("client_name", ""),
    "client_industry": payload.input_data.get("client_industry", ""),
    "transcript_storage_key": payload.input_data.get("transcript_storage_key", ""),
    "preread_storage_key": payload.input_data.get("preread_storage_key"),
    "agenda_storage_key": payload.input_data.get("agenda_storage_key"),
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
```

Also update the `RunAgentRequest` model — remove `project_id` field, it no longer applies:

```python
class RunAgentRequest(BaseModel):
    agent_type: str
    engagement_id: str | None = None
    input_data: dict = {}
```

---

## 11. Verification Checklist

After all files are written, run these in order:

```bash
# 1. Verify migration runs against Neon (test DB)
cd backend
source venv/Scripts/activate
alembic upgrade head

# 2. Verify tables were created
python -c "
import asyncio
from src.database import engine
from sqlalchemy import text, inspect

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\"))
        tables = [row[0] for row in result]
        print('Tables:', tables)
        expected = {'engagements', 'uploaded_documents', 'keystone_runs', 'acronym_glossary', 'teams', 'users', 'agent_runs', 'push_subscriptions'}
        missing = expected - set(tables)
        if missing:
            print('MISSING:', missing)
        else:
            print('All expected tables present.')

asyncio.run(check())
"

# 3. Run pytest
python -m pytest tests/ -x --tb=short

# 4. Run seed script
python scripts/seed_synthetic.py

# 5. Frontend typecheck
cd ../frontend && npm run typecheck

# 6. Frontend build
npm run build
```

All 6 steps must pass before Phase B is complete. Write `HANDOFF.md` when done.

---

## 12. Kickoff Prompt for Claude Code (Phase B)

See `KICKOFF-PHASE-B.md` in the project root.
