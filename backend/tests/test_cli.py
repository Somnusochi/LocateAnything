"""Tests for cross-platform command resolution in the root CLI."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("vlm_cli", ROOT / "cli.py")
assert SPEC and SPEC.loader
cli = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cli)


def test_partial_model_cache_downloads(monkeypatch, tmp_path):
    model = tmp_path / "model"
    model.mkdir()
    (model / "config.json").write_text("{}")
    calls = []
    monkeypatch.setattr(cli, "BACKEND", tmp_path)
    monkeypatch.setattr(cli, "run", lambda *a, **k: calls.append(a))
    cli.download_vlm()
    assert calls


@pytest.mark.parametrize("windows", [True, False])
def test_frontend_launch_resolves_tool(monkeypatch, windows):
    import urllib.request
    from types import SimpleNamespace

    calls = []
    monkeypatch.setattr(cli, "IS_WIN", windows)
    monkeypatch.setattr(cli, "is_port_open", lambda _: False)
    monkeypatch.setattr(cli.time, "sleep", lambda _: None)
    monkeypatch.setattr(cli.shutil, "which", lambda _: "pnpm.cmd" if windows else "/bin/pnpm")
    monkeypatch.setattr(urllib.request, "urlopen", lambda *a, **k: None)
    monkeypatch.setattr(
        cli.subprocess,
        "Popen",
        lambda cmd, **k: calls.append(cmd) or SimpleNamespace(poll=lambda: None),
    )
    cli.start_frontend()
    expected = ["cmd", "/d", "/c", "pnpm.cmd"] if windows else ["/bin/pnpm"]
    assert calls[0] == [*expected, "dev", "--port", str(cli.FRONTEND_PORT)]


def test_failed_migration_stops_setup(monkeypatch, capsys):
    monkeypatch.setattr(cli, "ALEMBIC", sys.executable)
    with pytest.raises(subprocess.CalledProcessError):
        cli.run_migrations()
    assert "up to date" not in capsys.readouterr().out


def test_backend_failure_preserves_output(monkeypatch):
    from types import SimpleNamespace

    calls = []
    monkeypatch.setattr(cli, "is_port_open", lambda _: False)
    monkeypatch.setattr(cli.time, "sleep", lambda _: None)

    def spawn(*args, **kwargs):
        calls.append(kwargs)
        return SimpleNamespace(poll=lambda: 3, returncode=3)

    monkeypatch.setattr(cli.subprocess, "Popen", spawn)
    with pytest.raises(SystemExit):
        cli.start_backend()
    assert calls[0].get("stdout") is None
    assert calls[0].get("stderr") is None


def test_check_pnpm_accepts_windows_cmd_shim(monkeypatch: pytest.MonkeyPatch) -> None:
    """Windows installs expose pnpm as pnpm.cmd and must not trigger reinstall."""
    pnpm_cmd = r"C:\Users\test\AppData\Roaming\npm\pnpm.CMD"
    monkeypatch.setattr(cli, "IS_WIN", True)
    monkeypatch.setattr(
        cli.shutil,
        "which",
        lambda name: pnpm_cmd if name == "pnpm.cmd" else None,
    )
    monkeypatch.setattr(cli, "run", lambda *_args, **_kwargs: pytest.fail("unexpected install"))

    cli.check_pnpm()


def test_install_node_deps_wraps_windows_cmd_shim(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """A .cmd shim must be launched through cmd.exe on Windows."""
    pnpm_cmd = r"C:\Users\test\AppData\Roaming\npm\pnpm.CMD"
    calls: list[tuple[list[str], dict]] = []
    monkeypatch.setattr(cli, "IS_WIN", True)
    monkeypatch.setattr(cli, "FRONTEND", tmp_path)
    monkeypatch.setattr(
        cli.shutil,
        "which",
        lambda name: pnpm_cmd if name in {"pnpm", "pnpm.cmd"} else None,
    )
    monkeypatch.setattr(cli, "run", lambda command, **kwargs: calls.append((command, kwargs)))

    cli.install_node_deps()

    assert calls == [
        (["cmd", "/d", "/c", pnpm_cmd, "install"], {"cwd": tmp_path}),
    ]
