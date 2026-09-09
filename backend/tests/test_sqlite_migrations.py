"""Exercise the complete migration chain against an empty database."""

import os
import subprocess
import sys
from pathlib import Path


def test_fresh_sqlite_upgrade(tmp_path):
    backend = Path(__file__).resolve().parents[1]
    env = {
        **os.environ,
        "PYTHONPATH": str(backend),
        "DATABASE_URL": f"sqlite:///{tmp_path / 'fresh.db'}",
    }
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
