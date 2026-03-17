---
id: T02
parent: S04
milestone: M001
provides:
  - Runtime errors wired into auto.ts gate block with pass/fail override
  - EvidenceJSON extended with optional runtimeErrors array
  - Markdown evidence table includes Runtime Errors section
key_files:
  - src/resources/extensions/gsd/auto.ts
  - src/resources/extensions/gsd/verification-evidence.ts
  - src/resources/extensions/gsd/tests/verification-evidence.test.ts
key_decisions:
  - Additive optional field keeps schemaVersion at 1 (per D002)
  - Runtime errors omitted from JSON when absent or empty (clean output for passing tasks)
  - Message truncated to 100 chars in markdown table, full in JSON
patterns_established:
  - Conditionally mutating the gate result object after capture (result.runtimeErrors = ...; result.passed = false)
observability_surfaces:
  - T##-VERIFY.json runtimeErrors array (optional, present only when errors exist)
  - Markdown evidence table "Runtime Errors" section with source/severity/blocking/message columns
  - stderr: "verification-gate: N blocking runtime error(s) detected" lines
duration: 15m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Wire runtime errors into gate block and extend evidence format

**Integrated captureRuntimeErrors() into auto.ts gate block and extended JSON/markdown evidence format with optional runtimeErrors array and 6 new tests**

## What Happened

Wired the `captureRuntimeErrors()` function (added in T01) into the live verification flow in `auto.ts`. After `runVerificationGate()` runs, runtime errors from bg-shell processes and browser console are captured and merged into the result. Blocking runtime errors override `result.passed = false` even when all verification commands passed. Blocking errors are logged to stderr with source and severity.

Extended `EvidenceJSON` in `verification-evidence.ts` with a `RuntimeErrorJSON` interface and optional `runtimeErrors` field. `writeVerificationJSON` includes the array only when non-empty. `formatEvidenceTable` appends a "Runtime Errors" section with Source, Severity, Blocking, and Message columns below the checks table. Messages are truncated to 100 chars in the table (full text preserved in JSON).

Added 6 new tests covering: JSON includes runtimeErrors when present, omits when absent, omits when empty array, markdown table appends section, omits section when none, and truncates messages to 100 chars.

## Verification

- `npm run test:unit -- --test-name-pattern "verification-evidence"` — all 20 tests pass (14 existing + 6 new)
- `npm run test:unit -- --test-name-pattern "verification-gate"` — all 28 tests pass (no regressions)
- `npm run test:unit` — 1088 pass, 8 fail (all 8 pre-existing: chokidar/octokit missing packages)
- `grep -n "captureRuntimeErrors" auto.ts` — 1 import (line 23) + 1 call site (line 1530)
- `grep -n "runtimeErrors" verification-evidence.ts` — appears in RuntimeErrorJSON, EvidenceJSON, writeVerificationJSON, and formatEvidenceTable

## Diagnostics

- Inspect `T##-VERIFY.json` for `runtimeErrors` array — present only when runtime errors were captured
- `jq '.runtimeErrors[] | select(.blocking)' *-VERIFY.json` to find blocking runtime errors across tasks
- `grep "blocking runtime error" stderr` during auto-mode to see live gate override notifications
- `schemaVersion` remains `1` — downstream consumers don't need changes for this additive field

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/auto.ts` — Added captureRuntimeErrors import, call after runVerificationGate(), blocking error override, and stderr logging
- `src/resources/extensions/gsd/verification-evidence.ts` — Added RuntimeErrorJSON interface, runtimeErrors? on EvidenceJSON, conditional write in writeVerificationJSON, Runtime Errors section in formatEvidenceTable
- `src/resources/extensions/gsd/tests/verification-evidence.test.ts` — Added 6 new tests for runtime error evidence format
- `.gsd/milestones/M001/slices/S04/tasks/T02-PLAN.md` — Added Observability Impact section (pre-flight fix)
