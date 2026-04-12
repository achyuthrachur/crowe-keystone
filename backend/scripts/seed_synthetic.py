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
from src.database import _build_asyncpg_url, _ssl_context
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
    engine = create_async_engine(
        _build_asyncpg_url(settings.DATABASE_URL),
        echo=False,
        connect_args={"ssl": _ssl_context},
    )
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
