"""Load course files and index them into an already-running Agent service."""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ingestion import load_directory
from app.providers import DeterministicConceptExtractor
from app.settings import Settings


def post_json(url: str, payload: dict) -> dict:
    request = Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8300")
    parser.add_argument("--data-dir", type=Path)
    args = parser.parse_args()

    settings = Settings()
    data_dir = args.data_dir or settings.resolved_rag_data_dir
    slides = [slide for slide in load_directory(data_dir) if slide.content.strip()]
    if not slides:
        raise SystemExit(f"No readable course slides found in {data_dir}")

    extractor = DeterministicConceptExtractor()
    documents = defaultdict(list)
    for slide in slides:
        slide.concepts = extractor.extract(slide)
        documents[(slide.document_id, slide.version, slide.day)].append(slide)

    total = 0
    for (document_id, version, day), document_slides in documents.items():
        result = post_json(
            f"{args.base_url.rstrip('/')}/build-graph",
            {
                "document_id": document_id,
                "version": version,
                "day": day,
                "slides": [slide.to_dict() for slide in document_slides],
            },
        )
        indexed = int(result["indexed_slides"])
        total += indexed
        print(f"{day}: {document_id} -> {indexed} slides")

    print(f"Indexed {total} slides into {args.base_url}")


if __name__ == "__main__":
    main()
