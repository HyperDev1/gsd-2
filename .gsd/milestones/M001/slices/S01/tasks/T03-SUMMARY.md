---
id: T03
parent: S01
milestone: M001
provides:
  - runVerificationGate wired into handleAgentEnd in auto.ts, fires after every execute-task completion
key_files:
  - src/resources/extensions/gsd/auto.ts
key_decisions:
  - Gate inserted between artifact verification / clearUnitRuntimeRecord block and DB dual-write, before post-unit hooks
  - Used parsePlan (not readSlicePlan which doesn't exist) to extract task plan verify field
  - unitId format is M001/S01/T03 (3-part), not S01/T03 (2-part) as plan suggested — adapted split logic to parts.length >= 3
patterns_established:
  - Gate is non-fatal: entire block wrapped in try/catch, errors logged to stderr with "verification-gate:" prefix
  - Results logged via ctx.ui.notify() with pass/fail counts; failures additionally written to stderr with command names, exit codes, and first 500 chars of stderr
observability_surfaces:
  - ctx.ui.notify() messages with "Verification gate:" prefix showing pass/fail counts
  - stderr structured output with per-command exit codes and truncated stderr on failure
  - stderr "verification-gate: error" line if gate itself throws
duration: 10m
verification_result: passed
completed_at: 2026-03-16
blocker_discovered: false
---

# T03: Wire verification gate into auto.ts handleAgentEnd

**Wired `runVerificationGate` call into `handleAgentEnd` so the verification gate fires automatically after every execute-task completion**

## What Happened

Added two imports to auto.ts (`parsePlan` from files.js, `runVerificationGate` from verification-gate.js; `loadEffectiveGSDPreferences` was already imported) and a ~50-line verification gate block in `handleAgentEnd`. The block:

1. Guards on `currentUnit.type === "execute-task"` — skips hooks, triage, quick-task, etc.
2. Loads effective preferences to get `verification_commands`
3. Parses the current slice plan to extract the task's `verify` field (discovery source 2 per D003)
4. Calls `runVerificationGate()` with basePath, unitId, cwd, preferenceCommands, and taskPlanVerify
5. Logs results: pass count on success via `ctx.ui.notify()`, command names + exit codes + stderr on failure via both `ctx.ui.notify()` and `process.stderr`
6. Entire block wrapped in try/catch — gate errors are non-fatal

Insertion point: after the artifact verification / hook cleanup if/else block closes and before the DB dual-write section. This ensures the gate fires after unit completion artifacts are persisted but before the DB re-import and post-unit hook dispatch.

## Verification

- `npm run test:unit` — 1045 passed, 8 failed (all 8 pre-existing: chokidar/octokit missing package failures unrelated to this change)
- `npm run test:unit -- --test-name-pattern "verification-gate"` — all 28 verification-gate tests pass
- `grep -n "runVerificationGate" src/resources/extensions/gsd/auto.ts` — exactly 2 hits: 1 import, 1 call site
- Code review confirms: gate is inside non-hook block scope, before DB dual-write, before `checkPostUnitHooks`, guarded by execute-task type check, wrapped in try/catch

## Diagnostics

- Check stdout/stderr during auto-mode runs for "Verification gate:" messages
- Success: `Verification gate: 3/3 checks passed`
- Failure: `Verification gate: FAILED — npm run lint, npm run test` + stderr lines with exit codes
- Gate error: `verification-gate: error — <message>` on stderr

## Deviations

- Plan referenced `readSlicePlan` from `files.ts` — this function doesn't exist. Used `parsePlan` (exported from files.ts) instead, loading the slice plan file via existing `resolveSliceFile` + `loadFile` patterns already used in auto.ts
- Plan suggested `currentUnit.id` format is `S01/T02` (2-part) — actual format is `M001/S01/T03` (3-part). Adapted split to `parts.length >= 3` with destructuring `[mid, sid, tid]`
- Block is ~50 lines rather than ~25 due to the task plan verify field discovery logic needing file I/O (resolveSliceFile + loadFile + parsePlan + find task entry)

## Known Issues

None

## Files Created/Modified

- `src/resources/extensions/gsd/auto.ts` — added imports for `parsePlan` and `runVerificationGate`; added ~50-line verification gate block in `handleAgentEnd`
