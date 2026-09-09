# Startup failure diagnostics and SQLite migrations

## Background
Issue #9 reports backend exit code 3 without a traceback. The exact reporter
failure is unconfirmed. Fresh SQLite migrations fail on PostgreSQL-only JSONB.
CLI setup ignores migration exit codes and startup discards stderr.

## Acceptance
Fresh SQLite upgrades reach head, PostgreSQL retains JSONB, failed migrations
stop setup, and backend startup output remains visible in the terminal.

## Scope and compatibility
Two historical migrations and root cli.py. No API or default port changes.
Use the JSON variant approach contributed by PyTs1n9 in PR #8; do not import
its database or unrelated changes. Existing databases are not rewritten.

## Verification
RED: focused pytest run produced 3 expected failures: SQLite JSONB compilation,
missing CalledProcessError for failed migrations, and discarded backend output.
GREEN: migration commands now use checked execution with inherited output;
backend output is inherited; JSON uses a PostgreSQL JSONB variant.
REFACTOR: formatted new tests; kept the existing CLI helpers and migration IDs.

Final validation (2026-09-09):
- `PYTHONPATH=. .venv/bin/pytest tests/ -q --tb=short`: 75 passed, 20 skipped.
- `.venv/bin/ruff check app tests`: passed.
- `.venv/bin/ruff format --check app tests`: passed, 65 files.
- `pnpm run build` in frontend: TypeScript and production build passed.
- `git diff --check`: passed.

No Windows or live PostgreSQL instance was used. The reporter's underlying
failure remains unconfirmed until a retry with visible startup output.
Tests use temporary databases only. Reverting restores the prior startup
behavior; no new schema revision or data migration is introduced.
