"""Build the Knowledge Graph + vector index from slides in agent/data/raw.

Usage (from agent/ with venv active):
    python scripts/build_graph.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings
from app.graph.nodes.graph_builder import build_all


def main() -> None:
    results = build_all(settings.data_dir)
    if not results:
        print(f"No supported slides found in {settings.data_dir}")
        print("Drop .txt, .md, .pdf, or .docx files there and re-run this script.")
        return

    for result in results:
        print(
            f"  - {result['source']} ({result['day']}): "
            f"{result['chunks_indexed']} chunks indexed, "
            f"{result['concepts_extracted']} concepts extracted"
        )


if __name__ == "__main__":
    main()
