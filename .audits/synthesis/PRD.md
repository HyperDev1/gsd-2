# GSD Agency Upgrade: Evidence-Closed Autonomy

**Status:** Approved
**Date:** 2026-03-16
**Source:** Three independent audits (Claude Opus 4.6, Codex GPT-5, Gemini 2.0) synthesized into unified scope

---

## Problem Statement

GSD has strong autonomy primitives — browser tools, worktree isolation, background shell, async jobs, post-unit hooks, dispatch rules, recovery gates. The limiting factor is that critical quality loops are socially enforced by prompts rather than mechanically enforced by runtime policy:

- Execution summaries can overstate proof — nothing forces the agent to actually run typecheck/lint/tests before marking done
- UAT pauses too aggressively — the agent has full Playwright capabilities but most web UAT still stops for human review
- Runtime setup is repeatedly inferred instead of declared
- Browser verification is manual at the flow level — the agent composes many primitive calls each time
- Supervision detects timeouts but does not reason about recovery
- The gap between "works locally" and "works in production" is untracked

This creates avoidable human pauses, defect leakage, and repeated token waste.

## Thesis

The upgrade is not "give the agent more raw power." The upgrade is converting existing powers into mandatory, composable, evidence-producing loops. A unit is done when GSD has machine-readable proof that required checks passed — not because the agent said so.

## Design Principles

1. **Enforce, don't suggest.** Every quality loop gates progression, not advises it.
2. **Evidence over prose.** Verification produces structured, machine-queryable proof.
3. **Existing substrate first.** Build on post-unit-hooks, dispatch rules, preferences, and browser primitives — no new orchestration layer.
4. **Solo-dev workflow.** No team coordination overhead. Lex + Claude Code only.
5. **Opt-in for irreversible operations.** Push, PR, deploy require explicit preference configuration.

---

## Scope

### In Scope

| # | Area | Category |
|---|------|----------|
| 1 | Enforced Verification Gate | Verification |
| 2 | Structured Verification Evidence | Verification |
| 3 | Runtime Error Capture | Verification |
| 4 | Executable UAT Types | UAT |
| 5 | `browser_verify_flow` Tool | UAT |
| 6 | Runtime Stack Contracts | Runtime |
| 7 | Git Push + Draft PR | Operations |
| 8 | Deploy-and-Verify Hook | Operations |
| 9 | Active Supervisor Sidecar | Supervision |
| 10 | Dependency Security Scan | Verification |

### Out of Scope

| Area | Reason |
|------|--------|
| GSD state machine tool | `auto-dispatch.ts` already enforces state transitions; a second abstraction creates dual source of truth |
| Semantic merge via LSP | Research-grade; `parallel-merge.ts` handles common cases |
| VLM-based visual UI feedback | Multimodal screenshot review already works natively in Claude |
| Context compaction tool | `continue.md` + `session-forensics.ts` already handle this |
| Generic environment repair tool | Runtime stack contracts solve the specific problem without a general-purpose env manager |

---

## Area Specifications

### 1. Enforced Verification Gate

A built-in post-unit hook that fires after every `execute-task` completion.

**Behavior:**
- Discovers verification commands from: (a) `verification_commands` preference, (b) task plan's `verify:` field, (c) package.json scripts (`typecheck`, `lint`, `test`)
- Runs each command, captures stdout/stderr and exit code
- On failure: re-dispatches `execute-task` with failure context (auto-fix loop, max retries configurable)
- On success: writes structured proof block to task summary
- Task cannot complete without passing verification or explicit override

**Preference surface:**
```yaml
verification_commands: ["npm run typecheck", "npm run lint"]
verification_auto_fix: true
verification_max_retries: 2
```

**Implementation surface:**
- `post-unit-hooks.ts` — built-in `verify-after-execute` hook profile
- `auto-recovery.ts` — retry path for verification failures
- `preferences.ts` — new preference keys
- `templates/task-summary.md` — verification evidence section

---

### 2. Structured Verification Evidence

Every task summary, slice summary, and UAT result gains a canonical verification evidence format.

**Evidence format:**

```markdown
## Verification Evidence

| Check | Command/Tool | Expected | Observed | Verdict |
|-------|-------------|----------|----------|---------|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | PASS |
| Lint | `npm run lint` | exit 0 | exit 0 | PASS |
| Unit tests | `npm test` | all pass | 47/47 pass | PASS |
| Browser smoke | `browser_assert` | login form visible | login form visible | PASS |
```

**Adjacent machine-readable artifact:**
- `T01-VERIFY.json` alongside `T01-SUMMARY.md`
- `S01-UAT-VERIFY.json` alongside `S01-UAT-RESULT.md`

**Downstream consumers:**
- Milestone validation queries structured proof instead of parsing prose
- Replanning can identify proof gaps directly
- Regressions become auditable

**Implementation surface:**
- `templates/task-summary.md` — add evidence section
- `templates/slice-summary.md` — add evidence section
- `observability-validator.ts` — validate evidence block presence and structure
- `auto-recovery.ts` — trigger verification hook if evidence block missing

---

### 3. Runtime Error Capture

During browser verification or dev server execution, systematically capture and review background errors.

**Captured signals:**
- Server stderr/stdout from `bg-shell` processes
- Browser console errors via `browser_console`
- Unhandled promise rejections and deprecation warnings

**Behavior:**
- After browser checks complete, agent reviews server process output for errors
- Errors surface in the verification evidence block
- Critical errors (crashes, unhandled rejections) fail the verification gate

**Implementation surface:**
- `prompts/execute-task.md` — mandatory post-browser server log review
- `post-unit-hooks.ts` — built-in `check-runtime-errors` hook inspecting active bg-shell output

---

### 4. Executable UAT Types

Expand the UAT type system to reduce unnecessary human pauses.

**Type expansion:**

| UAT Type | pauseAfterDispatch | Agent Behavior |
|----------|-------------------|----------------|
| `artifact-driven` | `false` | Check file artifacts exist and contain expected content |
| `browser-executable` | `false` | Boot app, run browser flow, assert expected states, capture screenshots |
| `runtime-executable` | `false` | Run CLI commands, check outputs, verify API responses |
| `human-judgment` | `true` | Pause for subjective human review |
| `mixed` | `true` | Agent runs automatable checks, then pauses for human residual |

**Executable UAT schema:**

For `browser-executable` and `runtime-executable` UAT, the UAT document gains structured executable sections:

```markdown
## Executable Checks

### 1. {{checkName}}
- **Type:** browser | cli | api
- **Precondition:** {{server running on port 3000}}
- **Steps:**
  1. browser_navigate http://localhost:3000/login
  2. browser_fill_form [{"selector": "#email", "value": "test@test.com"}]
  3. browser_assert {"selector": ".dashboard", "visible": true}
- **On Failure:** screenshot + browser console dump

## Human-Only Residual

- {{subjective checks that still need a human}}
```

**Implementation surface:**
- `files.ts` — expand `UatType` union
- `auto-dispatch.ts` — update `pauseAfterDispatch` logic
- `templates/uat.md` — add structured executable sections
- `prompts/run-uat.md` — browser flow execution instructions for new types

---

### 5. `browser_verify_flow` Tool

A higher-level browser tool that composes existing primitives into deterministic, evidence-producing flows.

**Input:**
- Flow name
- Preconditions (server URL, auth state)
- Ordered steps with inline assertions
- Retry policy
- Failure capture policy (screenshot, HAR, console dump)

**Output:**
- Structured PASS/FAIL verdict
- Failed step index (if applicable)
- Assertion diff
- Debug bundle path
- Condensed explanation safe for inlining into summaries

**Composes existing primitives:**
- `browser_navigate`, `browser_assert`, `browser_fill_form`, `browser_screenshot`
- `browser_batch`, `browser_diff`
- Trace, HAR, and console tooling

**Implementation surface:**
- `browser-tools/tools/flow.ts` — new tool
- References `BROWSER-TOOLS-V2-PROPOSAL.md` for design alignment

---

### 6. Runtime Stack Contracts

A project-level declarative contract for how to boot, seed, and observe the application.

**Location:** `.gsd/RUNTIME.md`

**Contract fields:**
```markdown
## Startup
- command: npm run dev
- readiness: http://localhost:3000 returns 200
- timeout: 30s

## Services
- database: docker compose up -d postgres
- readiness: pg_isready -h localhost

## Seed
- command: npm run seed

## Preview URLs
- app: http://localhost:3000
- api: http://localhost:3000/api

## Observability
- logs: bg_shell stdout
- health: curl http://localhost:3000/health
```

**Behavior:**
- When `.gsd/RUNTIME.md` exists, its contents are injected into `execute-task` and `run-uat` prompts as context
- The supervisor and UAT runner consume this contract instead of ad-hoc inference
- Optional — projects without a runtime contract work as they do today

**Implementation surface:**
- `templates/runtime.md` — new template
- `prompts/execute-task.md` — inject runtime contract when present
- `prompts/run-uat.md` — inject runtime contract for browser-executable UAT

---

### 7. Git Push + Draft PR on Milestone Completion

Opt-in automation for the git ceremony after milestone completion.

**Behavior:**
- After `complete-milestone`, if enabled:
  - Push milestone branch to remote
  - Create draft PR via `gh pr create --draft` with milestone summary as body
  - Run `gh pr checks` and report status
- Milestone-level only (not per-task)
- Draft PRs only
- Preference-gated

**Preference surface:**
```yaml
git:
  auto_push: false
  auto_pr: false
```

**Implementation surface:**
- `auto-dispatch.ts` — post-milestone dispatch rule or hook
- `git-service.ts` — push + PR creation functions

---

### 8. Deploy-and-Verify Hook

A post-milestone hook that closes the local-to-production gap.

**Behavior:**
1. Trigger deployment via configured MCP provider (Railway, Vercel, custom)
2. Poll for deployment readiness
3. Run smoke tests against deployed URL (browser tools or curl)
4. Write deployment verification evidence to milestone validation
5. Report pass/fail

**Preference surface:**
```yaml
deploy:
  provider: railway
  smoke_url: https://app.example.com
  smoke_checks: ["browser_verify_flow:login", "curl:health"]
```

**Implementation surface:**
- `post-unit-hooks.ts` — built-in `deploy-and-verify` hook profile
- Leverages existing MCP tools (`railway_get_deployments`, `railway_get_logs`, `railway_redeploy_service`)

---

### 9. Active Supervisor Sidecar

Upgrade supervision from timer-driven watchdog to bounded diagnostic reasoning.

**Capabilities:**
- Inspect activity logs and last tool traces
- Check in-flight `bg-shell` processes for crashes
- Distinguish "stuck" from "long-running" using activity heuristics
- Inject recovery context with specific diagnostic findings
- Request one bounded retry before escalating to skip/blocker

**Authority boundaries:**
- CAN: run diagnostics, inspect logs, inject context, request retry
- CANNOT: edit files, commit, push, take irreversible actions
- CANNOT: silently skip — must produce explicit evidence for skip decisions

**Implementation surface:**
- `auto-supervisor.ts` — add reasoning pass before timeout actions
- `preferences.ts` — `auto_supervisor.model` already exists; add `auto_supervisor.active: true`

---

### 10. Dependency Security Scan

Conditional post-execution security check.

**Behavior:**
- If `package.json` or lockfile changed during task execution, run `npm audit --audit-level=moderate`
- Flag critical/high vulnerabilities in the verification evidence block
- Non-blocking: warn, don't fail the verification gate

**Implementation surface:**
- `post-unit-hooks.ts` — built-in `security-scan` hook
- Conditional: only fires when package manifest changes detected

---

## Phasing

### Phase 1: Verification Enforcement
**Goal:** No task completes without verifiable evidence.

- Area 1: Enforced Verification Gate
- Area 2: Structured Verification Evidence
- Area 3: Runtime Error Capture
- Area 10: Dependency Security Scan

Phase 1 is prerequisite for Phase 2 — the verification evidence format feeds executable UAT.

### Phase 2: Executable UAT
**Goal:** Eliminate UAT pauses for everything the agent can verify itself.

- Area 4: Executable UAT Types
- Area 5: `browser_verify_flow` Tool
- Area 6: Runtime Stack Contracts

### Phase 3: Operational Automation
**Goal:** Close the loop from code to production without manual ceremony.

- Area 7: Git Push + Draft PR
- Area 8: Deploy-and-Verify Hook

### Phase 4: Supervisor Upgrade
**Goal:** Smarter failure recovery.

- Area 9: Active Supervisor Sidecar

Phases 3 and 4 are independent and can run in parallel.

---

## Success Criteria

| Metric | Before | After Phase 1 | After Phase 2 | After All |
|--------|--------|---------------|---------------|-----------|
| Tasks with machine-readable verification evidence | ~30% (prompt-dependent) | ~95% (enforced) | ~95% | ~98% |
| Web UAT pauses requiring human | ~70% | ~70% | ~20% (human-judgment only) | ~15% |
| Broken-test commits | occasional | near-zero | near-zero | near-zero |
| Manual git ceremony per milestone | push + PR + check | push + PR + check | push + PR + check | zero |
| Local→prod verification gap | untracked | untracked | untracked | closed |
| Supervisor recoveries without human | ~40% | ~40% | ~40% | ~80% |

---

## Open Questions

1. **Verification command discovery:** Auto-detect from package.json scripts, or always require explicit preference configuration? Auto-detect is more ergonomic but less predictable. **Recommendation:** auto-detect with preference override.

2. **`browser_verify_flow` scope:** GSD-specific tool or general browser-tools extension? **Recommendation:** general browser-tools extension — useful outside GSD and consistent with existing tool organization.

3. **Deploy provider abstraction:** Abstract across Railway/Vercel/custom now, or target Railway first and generalize later? **Recommendation:** Railway first, abstract when a second provider is needed.

4. **Supervisor model cost:** Active supervisor fires a reasoning pass on every timeout event. Use a cheaper model (Haiku) for initial triage? **Recommendation:** yes, Haiku for triage, escalate to stronger model when needed. `auto_supervisor.model` preference already exists.
