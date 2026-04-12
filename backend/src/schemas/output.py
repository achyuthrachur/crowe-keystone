from pydantic import BaseModel


class OutputFilesResponse(BaseModel):
    """Returned by GET /engagements/{id}/output to confirm files are available."""
    engagement_id: str
    deck_brief_available: bool
    deck_handoff_available: bool
    deck_brief_download_url: str   # /api/v1/output/{engagement_id}/brief
    deck_handoff_download_url: str # /api/v1/output/{engagement_id}/handoff
