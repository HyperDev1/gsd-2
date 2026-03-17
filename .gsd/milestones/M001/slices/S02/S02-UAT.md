# S02: Structured Evidence Format — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All deliverables are code modules, test files, and template changes that can be verified through unit tests and file inspection. No live runtime or browser interaction required.

## Preconditions

- Working directory is the project root with `node_modules` installed
- Node.js ≥ 20.6 available
- S01 verification gate is already merged and functional (28 tests passing)

## Smoke Test

Run `npm run test:unit -- --test-name-pattern "verification-evidence"` — all 15 tests should pass. This confirms the evidence writer module, validator rules, and integration chain all work.

## Test Cases

### 1. JSON artifact shape correctness

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "writeVerificationJSON writes correct JSON shape" passes
3. **Expected:** JSON output contains `schemaVersion: 1`, `taskId`, `unitId`, `timestamp`, `passed`, `discoverySource`, and `checks` array with `command`, `exitCode`, `durationMs`, `verdict` per check.

### 2. stdout/stderr exclusion from JSON

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "writeVerificationJSON excludes stdout/stderr from output" passes
3. **Expected:** JSON file contains no `stdout` or `stderr` keys at any level. This prevents unbounded file sizes and secret leakage.

### 3. Verdict mapping correctness

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "writeVerificationJSON maps exitCode to verdict correctly" passes
3. **Expected:** exitCode 0 → verdict "pass", any non-zero exitCode → verdict "fail"

### 4. Markdown evidence table formatting

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "formatEvidenceTable returns markdown table with correct columns" passes
3. **Expected:** Table has columns: `#`, `Command`, `Exit Code`, `Verdict`, `Duration`. Each row has ✅ for pass, ❌ for fail. Duration formatted as `Xs` (seconds with 1 decimal).

### 5. Empty checks produce unambiguous message

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "formatEvidenceTable returns no-checks message for empty checks" passes
3. **Expected:** Returns `_No verification checks discovered._` — not an empty table or blank output.

### 6. Directory auto-creation on JSON write

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "writeVerificationJSON creates directory if it doesn't exist" passes
3. **Expected:** writeVerificationJSON creates the target directory with `{ recursive: true }` if it doesn't exist, then writes the JSON file successfully.

### 7. auto.ts gate block wiring

1. Run `grep -n writeVerificationJSON src/resources/extensions/gsd/auto.ts`
2. **Expected:** Two hits — line ~24 (import) and line ~1545 (call inside gate block)
3. Run `npx --yes tsx src/resources/extensions/gsd/auto.ts`
4. **Expected:** Compiles cleanly with no errors

### 8. Task summary template has evidence section

1. Run `grep "## Verification Evidence" src/resources/extensions/gsd/templates/task-summary.md`
2. **Expected:** Section exists between `## Verification` and `## Diagnostics` with table column headers (#, Command, Exit Code, Verdict, Duration)

### 9. Execute-task prompt instructs evidence table population

1. Run `grep -n "evidence" src/resources/extensions/gsd/prompts/execute-task.md`
2. **Expected:** Step 8 instructs agents to populate the `## Verification Evidence` table from gate output with command, exit code, verdict, and duration.

### 10. Validator rejects missing evidence section

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "validator warns when evidence section is missing" passes
3. **Expected:** `validateTaskSummaryContent()` returns a warning with ruleId `evidence_block_missing` when a summary lacks `## Verification Evidence`.

### 11. Validator rejects placeholder-only evidence section

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "validator warns when evidence section has only placeholder text" passes
3. **Expected:** `validateTaskSummaryContent()` returns a warning with ruleId `evidence_block_placeholder` when the section contains only mustache template text.

### 12. Validator accepts "no checks discovered" as valid

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "validator accepts 'no checks discovered' as valid content" passes
3. **Expected:** The `_No verification checks discovered._` message is treated as real content, not placeholder — no warning produced.

### 13. Full integration chain

1. Run `npm run test:unit -- --test-name-pattern "verification-evidence"`
2. Confirm test "integration — VerificationResult → JSON → table → validator accepts" passes
3. **Expected:** Creates a VerificationResult, writes JSON to temp dir, reads back and validates shape, generates evidence table, embeds in mock summary, validates with `validateTaskSummaryContent()` — no evidence warnings.

### 14. S01 gate tests still pass (regression check)

1. Run `npm run test:unit -- --test-name-pattern "verification-gate"`
2. **Expected:** All 28 S01 verification gate tests pass. No regressions from S02 changes.

### 15. Full test suite regression check

1. Run `npm run test:unit`
2. **Expected:** ≥1055 pass. Only pre-existing failures (chokidar, @octokit/rest). Zero new failures.

## Edge Cases

### Empty VerificationResult (no commands discovered)

1. Call `writeVerificationJSON` with a result that has `checks: []`
2. **Expected:** JSON file written with `passed: true`, `checks: []`. `formatEvidenceTable` returns `_No verification checks discovered._`

### Evidence write to non-existent nested directory

1. Call `writeVerificationJSON` with a `tasksDir` like `/tmp/a/b/c/tasks` that doesn't exist
2. **Expected:** Directory chain created recursively, JSON file written successfully

### Evidence write failure (permission denied, disk full)

1. Simulated in auto.ts — evidence write is inside a try/catch
2. **Expected:** Error logged to stderr with prefix `verification-evidence: write error —`. Gate continues normally — evidence failure is non-fatal.

## Failure Signals

- `npm run test:unit -- --test-name-pattern "verification-evidence"` reports any test failures
- `grep -c writeVerificationJSON src/resources/extensions/gsd/auto.ts` returns anything other than 2
- `grep "## Verification Evidence" src/resources/extensions/gsd/templates/task-summary.md` returns no matches
- `grep "evidence_block" src/resources/extensions/gsd/observability-validator.ts` returns fewer than 2 matches
- Any new test failures in the full suite beyond the 8 pre-existing ones

## Requirements Proved By This UAT

- R003 — Tests 1-6, 13 prove structured evidence format (JSON + markdown). Test 7 proves pipeline wiring.
- R004 — Tests 10-12 prove validator enforcement of evidence blocks in summaries.

## Not Proven By This UAT

- Live auto-mode execution producing real T##-VERIFY.json artifacts (requires running auto-mode end-to-end on a real project)
- Evidence JSON consumed by downstream milestone validation or regression audit tools (no consumers exist yet)
- S04 runtime error fields or S05 npm audit fields in the schema (future slices)

## Notes for Tester

- The 8 pre-existing test failures (chokidar/octokit) are unrelated missing dependency issues — ignore them.
- The `npx --yes tsx` compile check produces no output on success — absence of output IS the success signal.
- Duration formatting uses JavaScript's `toFixed(1)` which follows IEEE 754 — e.g., 150ms renders as `0.1s` not `0.2s` due to floating-point representation. This is correct behavior.
