---
id: T02
parent: S05
milestone: M001
provides:
  - "AuditWarningJSON interface and auditWarnings field on EvidenceJSON"
  - "writeVerificationJSON conditionally includes auditWarnings (non-empty only)"
  - "formatEvidenceTable appends 'Audit Warnings' markdown section with severity emojis"
  - "runDependencyAudit() wired into auto.ts gate block after captureRuntimeErrors()"
key_files:
  - src/resources/extensions/gsd/verification-evidence.ts
  - src/resources/extensions/gsd/auto.ts
  - src/resources/extensions/gsd/tests/verification-evidence.test.ts
key_decisions: []
patterns_established:
  - "auditWarnings follows the same conditional-inclusion pattern as runtimeErrors: only included in JSON/markdown when array is non-empty"
observability_surfaces:
  - gate-output
  - evidence-json
  - evidence-markdown
duration: 12m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Wire audit into evidence formatting and auto.ts gate block

**Wired runDependencyAudit() into the verification gate pipeline — audit warnings appear in evidence JSON and markdown, always non-blocking**

## What Happened

1. Extended `verification-evidence.ts`:
   - Added `AuditWarningJSON` interface with `name`, `severity`, `title`, `url`, `fixAvailable` fields.
   - Added `auditWarnings?: AuditWarningJSON[]` to `EvidenceJSON`.
   - Extended `writeVerificationJSON()` with conditional audit warnings block (mirrors runtimeErrors pattern — only included when array is non-empty).
   - Extended `formatEvidenceTable()` with "Audit Warnings" markdown section: table with `#`, `Package`, `Severity`, `Title`, `Fix Available` columns and severity emojis (🔴 critical, 🟠 high, 🟡 moderate, ⚪ low).

2. Wired `runDependencyAudit()` into `auto.ts` gate block:
   - Added `runDependencyAudit` to the import from `"./verification-gate.js"`.
   - Inserted audit block after `captureRuntimeErrors()` (line ~1540), before auto-fix retry logic.
   - Logs warning count and per-warning details to stderr. Does NOT modify `result.passed`.

3. Added 6 new tests in `verification-evidence.test.ts`:
   - `writeVerificationJSON includes auditWarnings when present`
   - `writeVerificationJSON omits auditWarnings when absent`
   - `writeVerificationJSON omits auditWarnings when empty array`
   - `formatEvidenceTable appends audit warnings section`
   - `formatEvidenceTable omits audit warnings section when none`
   - `integration — VerificationResult with auditWarnings → JSON → table`

## Verification

- `npm run test:unit` — 1106 pass, 8 fail (all pre-existing: chokidar/octokit missing). No new regressions.
- All 6 new audit evidence tests pass (verified in full suite run).
- All 12 T01 dependency-audit tests pass (verified in full suite run).
- All existing verification-evidence tests pass.
- `npx --yes tsx src/resources/extensions/gsd/verification-evidence.ts` — compiles cleanly (exit 0, no output).
- `grep -n "runDependencyAudit" src/resources/extensions/gsd/auto.ts` — 2 hits: line 23 (import) + line 1540 (call site).

### Slice-Level Verification

| Check | Status |
|-------|--------|
| `npm run test:unit -- --test-name-pattern "dependency-audit"` | ✅ 12 pass |
| `npm run test:unit -- --test-name-pattern "verification-evidence"` | ✅ all pass (existing + 6 new) |
| `npm run test:unit` | ✅ 1106 pass, 8 pre-existing fail |
| `npx --yes tsx src/resources/extensions/gsd/verification-gate.ts` | ✅ compiles (T01) |
| `npx --yes tsx src/resources/extensions/gsd/verification-evidence.ts` | ✅ compiles |
| `npm run test:unit -- --test-name-pattern "dependency-audit.*empty array"` | ✅ graceful paths pass (T01) |

All slice-level verification checks pass. S05 is complete.

## Diagnostics

- **stderr signals:** `verification-gate: N audit warning(s)` when audit finds vulnerabilities, followed by `  [severity] package: title` per warning.
- **Evidence JSON:** `auditWarnings` array in `T##-VERIFY.json` (absent when no warnings).
- **Evidence markdown:** "Audit Warnings" section with severity-emoji table (absent when no warnings).
- **Inspect:** `grep auditWarnings T##-VERIFY.json`, `grep "Audit Warnings" *-SUMMARY.md`.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/resources/extensions/gsd/verification-evidence.ts` — Added `AuditWarningJSON` interface, `auditWarnings` on `EvidenceJSON`, conditional JSON persistence and markdown formatting
- `src/resources/extensions/gsd/auto.ts` — Added `runDependencyAudit` import and ~8-line audit block in gate pipeline
- `src/resources/extensions/gsd/tests/verification-evidence.test.ts` — Added 6 audit warning evidence tests
- `.gsd/milestones/M001/slices/S05/tasks/T02-PLAN.md` — Added missing Observability Impact section (pre-flight fix)
