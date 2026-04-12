"""
file_parser.py — transcript and document file parser.

Public API:
    parse_transcript(file_bytes: bytes, filename: str) -> str
    parse_document(file_bytes: bytes, filename: str) -> str
"""
import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)


def parse_transcript(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".txt":
        return _parse_txt(file_bytes)
    if suffix == ".vtt":
        return _parse_vtt(file_bytes)
    if suffix == ".srt":
        return _parse_srt(file_bytes)
    if suffix == ".json":
        return _parse_fireflies_json(file_bytes)
    if suffix == ".pdf":
        return _parse_pdf(file_bytes)
    if suffix in (".docx", ".doc"):
        return _parse_docx(file_bytes)
    raise ValueError(
        f"Unsupported transcript format: {suffix!r}. "
        "Supported: .txt .vtt .srt .json .pdf .docx"
    )


def parse_document(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return _parse_pdf(file_bytes)
    if suffix in (".docx", ".doc"):
        return _parse_docx(file_bytes)
    if suffix == ".txt":
        return _parse_txt(file_bytes)
    raise ValueError(
        f"Unsupported document format: {suffix!r}. Supported: .pdf .docx .txt"
    )


# ── .txt ──────────────────────────────────────────────────────────────────────

def _parse_txt(file_bytes: bytes) -> str:
    text = file_bytes.decode("utf-8-sig", errors="replace")
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


# ── .vtt (WebVTT) ─────────────────────────────────────────────────────────────

_VTT_TS = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}")
_VTT_TAG = re.compile(r"<[^>]+>")


def _parse_vtt(file_bytes: bytes) -> str:
    lines = file_bytes.decode("utf-8-sig", errors="replace") \
        .replace("\r\n", "\n").replace("\r", "\n").split("\n")

    output, speaker, parts = [], None, []

    def flush():
        if parts:
            text = " ".join(parts).strip()
            if text:
                output.append(f"{speaker}: {text}" if speaker else text)
            parts.clear()

    for line in lines:
        s = line.strip()
        if not s:
            flush()
            speaker = None
            continue
        if s.startswith("WEBVTT") or s.startswith("NOTE") \
                or s.startswith("STYLE") or s.startswith("REGION"):
            continue
        if _VTT_TS.match(s):
            continue
        if re.match(r"^\d+$", s):
            continue
        # Extract speaker from <v Speaker Name>text</v>
        vm = re.search(r"<v\s+([^>]+)>", s)
        if vm:
            speaker = vm.group(1).strip()
        clean = _VTT_TAG.sub("", s).strip()
        if clean:
            parts.append(clean)

    flush()
    return "\n".join(output).strip()


# ── .srt (SubRip) ─────────────────────────────────────────────────────────────

_SRT_TS = re.compile(r"^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}$")
_SRT_TAG = re.compile(r"<[^>]+>")


def _parse_srt(file_bytes: bytes) -> str:
    lines = file_bytes.decode("utf-8-sig", errors="replace") \
        .replace("\r\n", "\n").replace("\r", "\n").split("\n")
    output = []
    for line in lines:
        s = line.strip()
        if not s or re.match(r"^\d+$", s) or _SRT_TS.match(s):
            continue
        clean = _SRT_TAG.sub("", s).strip()
        if clean:
            output.append(clean)
    return "\n".join(output).strip()


# ── .json (Fireflies) ─────────────────────────────────────────────────────────

def _parse_fireflies_json(file_bytes: bytes) -> str:
    """
    Handles three Fireflies export shapes:
    Shape 1: {"sentences": [{"speaker_name": str, "text": str}]}
    Shape 2: {"data": {"transcript": {"sentences": [...]}}}  (GraphQL export)
    Shape 3: {"transcript": "<plain text>"}
    """
    try:
        data = json.loads(file_bytes.decode("utf-8", errors="replace"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc}") from exc

    # Shape 3
    if isinstance(data.get("transcript"), str):
        return data["transcript"].strip()

    # Shape 2
    sentences = None
    if isinstance(data.get("data"), dict):
        nested = data["data"].get("transcript", {})
        if isinstance(nested, dict):
            sentences = nested.get("sentences")

    # Shape 1
    if sentences is None:
        sentences = data.get("sentences")

    if isinstance(sentences, list):
        lines = []
        for s in sentences:
            if not isinstance(s, dict):
                continue
            speaker = (s.get("speaker_name") or "").strip()
            text = (s.get("text") or s.get("raw_text") or "").strip()
            if not text:
                continue
            lines.append(f"{speaker}: {text}" if speaker else text)
        return "\n".join(lines).strip()

    raise ValueError(
        "Unrecognized Fireflies JSON. Expected 'sentences' array or 'transcript' string."
    )


# ── .pdf ──────────────────────────────────────────────────────────────────────

def _parse_pdf(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
        import io
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(p.strip() for p in pages if p.strip()).strip()
    except Exception as exc:
        raise ValueError(f"Could not parse PDF: {exc}") from exc


# ── .docx ─────────────────────────────────────────────────────────────────────

def _parse_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        import io
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip()).strip()
    except Exception as exc:
        raise ValueError(f"Could not parse DOCX: {exc}") from exc
