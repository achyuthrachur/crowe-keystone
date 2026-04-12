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
