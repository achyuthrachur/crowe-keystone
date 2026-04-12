"""
transcript_ingester.py — Node 1.

Reads uploaded files, parses transcript to normalized plain text.
No LLM call. Pure file I/O.

Inputs used from state:
    transcript_storage_key, preread_storage_key, agenda_storage_key

Outputs set in state:
    clean_transcript, current_node
"""
import logging
from pathlib import Path

from src.state import KeystoneState
from src.services.file_storage import retrieve_upload
from src.services.file_parser import parse_transcript, parse_document
from src.routers.stream import broadcast_to_team

logger = logging.getLogger(__name__)


async def transcript_ingester_node(state: KeystoneState) -> dict:
    await broadcast_to_team(state["team_id"], {
        "type": "agent.node_entered",
        "data": {"run_id": state["run_id"], "node": "transcript_ingester"},
    })

    try:
        transcript_bytes = await retrieve_upload(state["transcript_storage_key"])
        # Derive filename from storage key (last path segment)
        filename = state["transcript_storage_key"].rsplit("/", 1)[-1]
        clean_transcript = parse_transcript(transcript_bytes, filename)

        return {
            "clean_transcript": clean_transcript,
            "current_node": "noise_filter",
        }
    except Exception as exc:
        logger.exception("transcript_ingester failed: %s", exc)
        return {
            "status": "failed",
            "errors": [f"transcript_ingester: {exc}"],
            "current_node": "transcript_ingester",
        }
