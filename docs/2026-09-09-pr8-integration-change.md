# PR #8 integration review

Accept the full-history export UI, bundled decord fallback and model cache
validation, alongside the already accepted SQLite/UUID fixes. Retain existing
export API defaults. Resolve frontend launching through the cross-platform
helper rather than hardcoding pnpm.cmd. Keep port 8000 and exclude local DB.

Do not apply automatic CPU offload or reduce generation length/image size:
the custom model generation loop directly calls vision/MLP modules and needs
hardware validation for dispatch; reducing tokens caps the detection output
for all devices. These are separate tuning changes without accuracy evidence.

Acceptance: export button calls full-history API, bundled stub imports when
decord is absent, incomplete caches trigger download, frontend launcher works
on both platforms. Preserve original PR ancestry in the merge commit.

RED: four backend failures (cache, two launcher platforms, decord) and missing
frontend export button. GREEN: 83 backend tests passed, 20 skipped; 43 frontend
tests passed. Backend lint/format and frontend lint/TypeScript/build passed.
REFACTOR: import ordering and test formatting. GPU inference on physical CUDA
was not verified, so GPU tuning is excluded. No persisted schema change beyond previously
accepted compatibility fixes. Rollback via reverting merge; do not overwrite DB.
