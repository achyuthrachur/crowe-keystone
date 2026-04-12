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
