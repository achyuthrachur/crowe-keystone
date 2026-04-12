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
