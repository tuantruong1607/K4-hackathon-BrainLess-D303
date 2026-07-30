import importlib.util
from pathlib import Path
from types import SimpleNamespace


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"


def _load_script(name: str):
    path = SCRIPTS_DIR / name
    spec = importlib.util.spec_from_file_location(f"test_{path.stem}_script", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_build_graph_script_reuses_runtime_service(capsys) -> None:
    module = _load_script("build_graph.py")
    called = []
    runtime = SimpleNamespace(
        service=SimpleNamespace(
            build_directory=lambda: called.append(True)
            or [
                {
                    "document_id": "deck",
                    "version": "v1",
                    "day": "day01",
                    "indexed_slides": 2,
                    "concepts": ["JTBD"],
                }
            ]
        )
    )

    module.main(runtime=runtime)

    assert called == [True]
    assert "2 slides indexed" in capsys.readouterr().out
