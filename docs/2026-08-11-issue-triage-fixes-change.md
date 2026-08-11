# Issue Triage Fixes

## Background / Problem

- Issue #5 reports that the Windows CLI can discover the global `pnpm.cmd` shim but `subprocess.run(["pnpm", ...])` fails with `WinError 2`.
- Issue #7 reports that the UI can request a full YOLO Seg export, but the backend has no endpoint for exporting all saved detections.
- Issue #2 remains a product backlog item. The current development branch covers page organization and box editing, but collaboration, remote vision models, and multi-agent workflows are not complete.

## Current Behavior

- `cli.py` invokes `npm` and `pnpm` directly, which is unreliable for Windows `.cmd` shims.
- The export service supports an explicit list of detection IDs only; there is no all-detections export contract.

## Expected Behavior / Acceptance Criteria

- On Windows, CLI dependency commands invoke the discovered `.cmd` executable through the Windows command interpreter, while macOS/Linux behavior remains unchanged.
- The CLI recognizes both `pnpm` and `pnpm.cmd`, and uses the same resolved executable for installation.
- `POST /api/v1/detections/export-all` exports every saved detection in the requested format and returns a ZIP response.
- The all-detections endpoint returns a clear `400` error when there are no saved detections.
- Existing explicit-ID export behavior remains compatible.

## Affected Modules / Contracts

- `cli.py`
- `backend/app/api/routes/export.py`
- `backend/app/services/export.py`
- `backend/app/repositories/detection.py`
- CLI and backend export tests

## RED / GREEN / REFACTOR Evidence

- RED: `PYTHONPATH=. .venv/bin/pytest tests/test_cli.py -q` failed 2 tests because `check_pnpm()` ignored `pnpm.cmd` and `install_node_deps()` invoked the raw `pnpm` command.
- RED: `PYTHONPATH=. .venv/bin/pytest tests/test_export_all.py -q` failed during collection because `export_all` and the all-detections route did not exist.
- GREEN: `PYTHONPATH=. .venv/bin/pytest tests/test_cli.py tests/test_export_all.py -q` passed 6 tests.
- REFACTOR: shared export-format dispatch now serves both explicit-ID and all-detections exports; Windows command lookup and `.cmd` wrapping are shared by prerequisite checks and dependency installation.

## Final Validation

- `backend/.venv/bin/ruff check app tests` — passed.
- `backend/.venv/bin/ruff format --check app tests` — passed.
- `cd backend && PYTHONPATH=. .venv/bin/pytest tests/ -q --tb=short` — 72 passed, 20 skipped.
- `cd frontend && pnpm run lint` — passed.
- `cd frontend && pnpm run test` — 30 files / 42 tests passed.
- `cd frontend && pnpm run build` — passed.
- `git diff --check` — passed.

## Compatibility / Risk / Rollback

- The Windows command wrapper is platform-gated and does not change Unix command invocation.
- The new export endpoint is additive; existing export routes remain unchanged.
- Windows execution itself was not available in this macOS validation environment; command construction is covered by platform-forced unit tests.
- Rollback can remove the new endpoint and command-resolution helper without changing stored data.
