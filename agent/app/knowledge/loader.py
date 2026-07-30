"""Compatibility imports for the canonical slide ingestion domain."""

from app.domain import SlideInput as Slide
from app.ingestion import (
    SUPPORTED_SUFFIXES,
    TEXT_SUFFIXES,
    infer_day as _infer_day,
    load_directory,
    load_file,
)

__all__ = [
    "SUPPORTED_SUFFIXES",
    "TEXT_SUFFIXES",
    "Slide",
    "_infer_day",
    "load_directory",
    "load_file",
]
