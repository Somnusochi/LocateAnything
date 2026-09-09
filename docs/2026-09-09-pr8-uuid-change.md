# PR #8 UUID compatibility

HTTP routes and imports pass string IDs to a repository backed by UUID columns.
Accept the contributor's normalization for reads, inserts and replacements.
Acceptance: all four operations work on an isolated SQLite database with string
IDs. No schema changes. Preserve contributor authorship; lint-only adjustment.
RED: four tests failed with string IDs lacking the UUID hex attribute.
GREEN: applied PR #8 repository changes, all four operations passed.
REFACTOR: sorted imports. Full backend suite: 79 passed, 20 skipped.
Ruff lint and format checks passed. Invalid IDs remain errors; API validation is separate.
