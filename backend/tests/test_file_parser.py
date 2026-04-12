"""
test_file_parser.py — unit tests for backend/src/services/file_parser.py

Tests each supported format independently.
No database, no HTTP client needed.
"""
import json
import pytest
from src.services.file_parser import parse_transcript, parse_document


# ── .txt ──────────────────────────────────────────────────────────────────────

def test_parse_txt_basic():
    content = "Hello world\nThis is a transcript."
    result = parse_transcript(content.encode("utf-8"), "transcript.txt")
    assert "Hello world" in result
    assert "This is a transcript" in result


def test_parse_txt_strips_bom():
    # Encode as plain utf-8 so the BOM byte sequence is present in the bytes;
    # the parser decodes with utf-8-sig which strips the leading BOM.
    content = "\ufeffBOM at start of file"
    result = parse_transcript(content.encode("utf-8"), "transcript.txt")
    assert result.startswith("BOM")
    assert "\ufeff" not in result


def test_parse_txt_normalizes_crlf():
    content = "Line one\r\nLine two\r\nLine three"
    result = parse_transcript(content.encode("utf-8"), "transcript.txt")
    assert "\r\n" not in result
    assert "Line one" in result


# ── .vtt ──────────────────────────────────────────────────────────────────────

def test_parse_vtt_strips_timestamps():
    content = (
        "WEBVTT\n\n"
        "00:00:01.000 --> 00:00:04.000\n"
        "Hello from the meeting.\n\n"
        "00:00:05.000 --> 00:00:08.000\n"
        "Good morning everyone.\n"
    )
    result = parse_transcript(content.encode("utf-8"), "transcript.vtt")
    assert "00:00:01" not in result
    assert "Hello from the meeting" in result
    assert "Good morning everyone" in result


def test_parse_vtt_preserves_speaker_labels():
    content = (
        "WEBVTT\n\n"
        "00:00:01.000 --> 00:00:04.000\n"
        "<v John Smith>Hello from the meeting.</v>\n"
    )
    result = parse_transcript(content.encode("utf-8"), "transcript.vtt")
    assert "John Smith" in result
    assert "Hello from the meeting" in result


# ── .srt ──────────────────────────────────────────────────────────────────────

def test_parse_srt_strips_sequence_numbers_and_timestamps():
    content = (
        "1\n"
        "00:00:01,000 --> 00:00:04,000\n"
        "This is the first subtitle.\n\n"
        "2\n"
        "00:00:05,000 --> 00:00:08,000\n"
        "This is the second subtitle.\n"
    )
    result = parse_transcript(content.encode("utf-8"), "transcript.srt")
    assert "00:00:01,000" not in result
    assert "1" not in result.split("\n")[0]  # sequence number stripped
    assert "This is the first subtitle" in result
    assert "This is the second subtitle" in result


# ── .json (Fireflies) ─────────────────────────────────────────────────────────

def test_parse_fireflies_json_shape1():
    """Shape 1: top-level sentences array."""
    data = {
        "sentences": [
            {"speaker_name": "Alice", "text": "Hello everyone."},
            {"speaker_name": "Bob", "text": "Good morning."},
        ]
    }
    result = parse_transcript(json.dumps(data).encode("utf-8"), "transcript.json")
    assert "Alice: Hello everyone." in result
    assert "Bob: Good morning." in result


def test_parse_fireflies_json_shape2():
    """Shape 2: nested GraphQL data.transcript.sentences."""
    data = {
        "data": {
            "transcript": {
                "sentences": [
                    {"speaker_name": "Alice", "raw_text": "Testing shape two."},
                ]
            }
        }
    }
    result = parse_transcript(json.dumps(data).encode("utf-8"), "transcript.json")
    assert "Alice: Testing shape two." in result


def test_parse_fireflies_json_shape3():
    """Shape 3: plain transcript string."""
    data = {"transcript": "This is a plain transcript string."}
    result = parse_transcript(json.dumps(data).encode("utf-8"), "transcript.json")
    assert "This is a plain transcript string." in result


def test_parse_fireflies_json_invalid_raises():
    with pytest.raises(ValueError, match="Invalid JSON"):
        parse_transcript(b"not valid json {{", "transcript.json")


# ── Unsupported format ────────────────────────────────────────────────────────

def test_parse_transcript_unsupported_format_raises():
    with pytest.raises(ValueError, match="Unsupported"):
        parse_transcript(b"some content", "transcript.mp3")


def test_parse_document_unsupported_format_raises():
    with pytest.raises(ValueError, match="Unsupported"):
        parse_document(b"some content", "document.xlsx")
