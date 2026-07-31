"""Build the configured RAG stores from RAG_DATA_DIR."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.runtime import Runtime, build_runtime


def main(*, runtime: Runtime | None = None) -> None:
    selected = runtime or build_runtime()
    results = selected.service.build_directory()
    if not results:
        print(f"No supported slides found in {selected.settings.resolved_rag_data_dir}")
        return

    for result in results:
        print(
            f"  - {result['document_id']} ({result['day']}): "
            f"{result['indexed_slides']} slides indexed, "
            f"{len(result['concepts'])} concepts extracted"
        )


if __name__ == "__main__":
    main()
