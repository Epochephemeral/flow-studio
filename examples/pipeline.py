"""Illustrative contracts for the bundled document workspace.

These functions describe boundaries; Flow Studio does not execute them.
"""


def ingest(document):
    """Retain document text and its stable source identifier."""
    return {"id": document["id"], "text": document["text"]}


def route(document):
    """Choose plain text or transcription from explicit media metadata."""
    return "transcribe" if document.get("media_type") == "audio" else "text"


def transcribe(audio):
    """External transcription boundary; implementation supplied by the host."""
    raise NotImplementedError


def resolve(text=None, transcript=None):
    """Exactly one selected route supplies the document text."""
    return text if text is not None else transcript


def summarize(document):
    """Model boundary: return a summary with source citations."""
    raise NotImplementedError


def review(summary):
    """Model boundary: identify claims unsupported by the source."""
    raise NotImplementedError


def publish(reviewed_summary):
    """Publish only after the review verdict accepts the summary."""
    return reviewed_summary


def investigate(goal):
    """Harness chooses evidence-reading tools, limited to five calls."""
    raise NotImplementedError
