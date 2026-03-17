# S01: Built-in Verification Gate — Research

**Date:** 2026-03-16
**Depth:** Targeted

## Summary

The verification gate is a hardcoded call inserted into `auto.ts` `handleAgentEnd`, running after execute-task completes but *before* user-configured post-unit hooks fire. It discovers verification commands (from preferences → task plan `verify:` field → package.json scripts), spawns them sequentially via `child_process.execSync` or `spawnSync`, and returns a structured `VerificationResult` with per-command exit codes, stdout, and stderr. If all commands pass (exit 0), the gate passes and normal flow continues. If any fail, the gate blocks — S03 will later wrap this in a retry loop, but S01's job is to make the gate fire and block.

The codebase is well-suited for this. The `handleAgentEnd` function in `auto.ts` (line 1276) has a clear insertion point: after artifact verification (line ~1461) and before post-unit hooks check (line ~1500). The `TaskPlanEntry` type in `types.ts` already has an optional `verify?: string` field, and `files.ts` already parses `- Verify:` lines from slice plans (line 463). The preference system in `preferences.ts` has a clean pattern for adding new typed keys. No new external libraries are needed.

## Recommendation

Implement as three new files plus surgical edits to two existing files:

1. **New `verification-gate.ts`** — Pure function `runVerificationGate(basePath, unitId, cwd)` that discovers commands, runs them, and returns `VerificationResult`. No side effects beyond process spawning. Testable in isolation.
2. **New types in `types.ts`** — `VerificationResult` and `VerificationCheck` interfaces.
3. **New preference keys in `preferences.ts`** — `verification_commands`, `verification_auto_fix`, `verification_max_retries` added to `GSDPreferences` and validation.
4. **Integration call in `auto.ts`** — ~15 lines in `handleAgentEnd`, after artifact verification, before hooks. Only fires for `execute-task` unit type.

This approach follows D001 (hardcoded in handleAgentEnd, before user hooks) and keeps the gate as a pure function that S02–S05 can compose on top of.

## Implementation Landscape

### Key Files

- `src/resources/extensions/gsd/auto.ts` — 3758-line auto-mode orchestrator. `handleAgentEnd` (line 1276) is the integration point. The gate call goes at line ~1470 (after `triggerArtifactVerified` and `writeUnitRuntimeRecord`/`clearUnitRuntimeRecord`, before `checkPostUnitHooks` at line 1500). Only fires when `currentUnit.type === "execute-task"`. Must log results to stdout via `ctx.ui.notify()` and write to stderr for structured output.
- `src/resources/extensions/gsd/types.ts` — 379 lines. Pure interfaces file. Add `VerificationResult` and `VerificationCheck` here, following the existing pattern of grouped interfaces with doc comments.
- `src/resources/extensions/gsd/preferences.ts` — 1435 lines. Add `verification_commands?: string[]`, `verification_auto_fix?: boolean`, `verification_max_retries?: number` to `GSDPreferences` interface. Add to `KNOWN_PREFERENCE_KEYS` set. Add validation in `validatePreferences()`. Add to `mergePreferences()`.
- `src/resources/extensions/gsd/verification-gate.ts` — **New file.** Core logic: command discovery, command execution, result aggregation. Pure function, no framework dependencies beyond `child_process` and `fs`.
- `src/resources/extensions/gsd/files.ts` — Already parses `verify?: string` from task plans (line 463). No changes needed for S01 — the `TaskPlanEntry.verify` field is already extracted.
- `src/resources/extensions/gsd/post-unit-hooks.ts` — No changes needed. The gate runs *before* `checkPostUnitHooks` is called, so hooks see the same flow as today. Hook-on-hook prevention (line 63: `completedUnitType.startsWith("hook/")`) is unaffected because the gate only fires for `execute-task`.

### Build Order

**Build `types.ts` changes first** — Define `VerificationResult` and `VerificationCheck` interfaces. This unblocks everything downstream.

**Build `verification-gate.ts` second** — The pure gate function with command discovery and execution. Testable in complete isolation with temp dirs and mock package.json files. This is the riskiest piece (process spawning, command discovery logic, exit code handling) and should be proven early.

**Build `preferences.ts` changes third** — Add the three new preference keys. This is mechanical — follows the exact pattern of every other preference key in the 1435-line file.

**Build `auto.ts` integration last** — The ~15-line call site in `handleAgentEnd`. This is low risk once the gate function is proven. The insertion point is well-defined: after the `writeUnitRuntimeRecord`/`clearUnitRuntimeRecord` block for non-hook units (line ~1482), before `checkPostUnitHooks` (line ~1500). The gate only fires when `currentUnit.type === "execute-task"`.

### Verification Approach

1. **Unit tests for `verification-gate.ts`** — Test command discovery from preference override, from task plan verify field, and from package.json scripts. Test execution with mock commands (`echo pass`, `exit 1`). Test graceful handling of missing package.json, missing scripts, empty discovery. Follow the `createTestContext()` pattern from `tests/test-helpers.ts`.
2. **Unit tests for `preferences.ts` changes** — Test that `verification_commands`, `verification_auto_fix`, `verification_max_retries` are validated correctly. Follow patterns in `tests/preferences-schema-validation.test.ts`.
3. **Integration verification** — Run `npm run test:unit` to confirm all existing tests pass. The gate integration in `auto.ts` is a code path that only fires for `execute-task` units in auto-mode, so it won't affect any existing test that doesn't simulate a full auto-mode lifecycle.
4. **Observable behavior** — After integration, when `gsd auto` runs an execute-task, the gate should produce a notification via `ctx.ui.notify()` like "Verification gate: 3/3 checks passed" or "Verification gate: FAILED — npm run lint exited with code 1".

## Constraints

- **Must not break existing user hooks.** The gate fires *before* `checkPostUnitHooks`. It does not alter hook state, queue, or cycle counts. The gate is not itself a hook unit — it's a synchronous blocking call in `handleAgentEnd`.
- **Must not fire for hook units or non-execute-task units.** Gate for `currentUnit.type === "execute-task"` only. This is explicit in D001.
- **Process spawning must use the worktree cwd.** The `basePath` in auto-mode points to the worktree (or project root in `none` isolation). Verification commands run in this cwd, not the original project root. The `cwd` parameter is passed explicitly.
- **`verification_commands` preference uses first-non-empty-wins.** Discovery order: explicit `verification_commands` preference → `TaskPlanEntry.verify` field → package.json scripts. Per D003, once a source produces commands, later sources are skipped.
- **Package.json script detection** looks for specific script names: `typecheck`, `lint`, `test`. These are the conventional verification scripts. The gate runs them as `npm run <name>` (or discovers the actual command from the scripts object).
- **No timeout mechanism in S01.** The gate runs synchronously. Timeouts can be added later if needed, but the auto-mode supervisor already handles stuck-unit detection.

## Common Pitfalls

- **`execSync` throwing on non-zero exit code** — By default, `execSync` throws on non-zero exit. The gate must catch this and capture the exit code + stderr rather than crashing `handleAgentEnd`. Use `try/catch` or `spawnSync` with `{ stdio: 'pipe' }` which returns status without throwing.
- **Package.json not existing in worktree** — The worktree may not have a package.json (non-npm project, or the file lives in a parent monorepo). Discovery must check `existsSync` and gracefully return no commands when package.json is absent or has no matching scripts.
- **Task plan verify field format** — `TaskPlanEntry.verify` is a free-text string like "run tests" or "npm test && npm run lint". The gate needs to decide whether to shell-exec it directly or parse it. Simplest: if preference and package.json discovery both return empty, and `verify` is non-empty, run it as a shell command.
- **Hook-on-hook false positive** — The gate must NOT be registered as a hook unit type. If it were, `checkPostUnitHooks` would skip it (line 63). Since it's a synchronous call, not a dispatched unit, this isn't a concern — but the gate function must not alter `currentUnit.type`.

## Open Risks

- **Long-running test suites blocking auto-mode** — If `npm test` takes 10+ minutes, the gate blocks `handleAgentEnd` for that duration. The auto-mode supervisor timer continues ticking, and could fire a timeout. Mitigation: the supervisor's hard timeout (default 30min) should be sufficient. If not, async spawning with a gate-specific timeout can be added in a follow-up.
- **Monorepo workspace detection** — In monorepos with workspaces, `package.json` at the worktree root may be the workspace root, not the package being worked on. The gate should check the root package.json scripts. Workspace-aware detection is a future enhancement, not S01 scope.
