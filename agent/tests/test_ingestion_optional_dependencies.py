import builtins
import os
from pathlib import Path
import subprocess
import sys

import pytest

from app.errors import DependencyUnavailableError
from app.runtime import build_runtime
from app.settings import Settings


AGENT_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_DIR = AGENT_DIR.parent


def test_app_import_succeeds_when_document_loader_packages_are_unavailable() -> None:
    probe = """
import builtins

real_import = builtins.__import__
def blocked_import(name, *args, **kwargs):
    if name.split(".", 1)[0] in {"docx", "pypdf"}:
        raise ModuleNotFoundError(f"blocked optional module: {name}")
    return real_import(name, *args, **kwargs)

builtins.__import__ = blocked_import
import app.main
print("app-imported")
"""
    environment = os.environ.copy()
    existing_path = environment.get("PYTHONPATH")
    environment["PYTHONPATH"] = (
        str(AGENT_DIR)
        if not existing_path
        else str(AGENT_DIR) + os.pathsep + existing_path
    )

    result = subprocess.run(
        [sys.executable, "-c", probe],
        cwd=REPOSITORY_DIR,
        env=environment,
        capture_output=True,
        text=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "app-imported"


def test_missing_pdf_loader_during_build_directory_is_typed_503(
    monkeypatch, tmp_path: Path
) -> None:
    (tmp_path / "lesson.pdf").write_bytes(b"%PDF unavailable-loader probe")
    runtime = build_runtime(Settings(_env_file=None))
    real_import = builtins.__import__

    def blocked_import(name, *args, **kwargs):
        if name.split(".", 1)[0] == "pypdf":
            raise ModuleNotFoundError("blocked pypdf token=super-secret")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", blocked_import)

    with pytest.raises(DependencyUnavailableError) as captured:
        runtime.service.build_directory(tmp_path)

    assert "super-secret" not in str(captured.value)
    assert "super-secret" not in repr(captured.value)
