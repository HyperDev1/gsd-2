# GSD Agency Upgrade — Synthesized PRD/ADR

**Date:** 2026-03-16
**Input:** Three independent audits (Claude Opus 4.6, Gemini, Codex GPT-5)
**Status:** Draft — awaiting Lex review

---

## Executive Summary

Three independent audits of the GSD-2 system converge on one thesis: **GSD has the tools but lacks enforced loops that gate progression on verified evidence**. The agent can lint, test, browse, deploy, and commit — but the dispatch table only enforces artifact *existence*, not proof *quality*. This ADR defines a phased upgrade path that converts existing capabilities into mandatory, evidence-producing verification loops.

---

## Audit Cross-Reference

### Strong Consensus (all three audits)

| Theme | Claude | Gemini | Codex |
|-------|--------|--------|-------|
| Enforced verification gate after execute-task | #1 (self-lint) + #3 (smoke test) | #2 (verify tool) | #1 (verification policy engine) |
| Executable UAT (browser-verified, less pausing) | #2 (browser-verified UAT type) | #10 (VLM UI verify) | #2 (UAT class expansion) |
| Structured verification evidence | implicit | — | #5 (machine-consumable proof blocks) |
| Post-unit hooks as enforcement substrate | #3 (smoke test hook) | — | #7 (productize built-in hook profiles) |
| Runtime error capture during execution | #6 (stderr + console) | #3 (stateful shell + log monitor) | #6 (runtime stack contracts) |
| Deploy-and-verify loop | #5 (Railway/Vercel) | — | #9 (preview/staging verification) |
| Git push + PR automation | #4 (draft PR on milestone) | — | — |

### Partial Consensus (two audits)

| Theme | Sources | Notes |
|-------|---------|-------|
| Active supervisor sidecar | Codex #4 | Gemini #5 (context compactor) touches similar ground |
| Parallel milestone orchestration | Gemini #6 | Codex mentions parallel eligibility already exists in codebase |
| Semantic merge for parallel work | Gemini #9 | Only Gemini; parallel-merge.ts already exists |
| Capability acquisition at runtime | Codex #8 | Gemini #8 (env tool) is adjacent |
| Dependency security scan | Claude #7 | Codex mentions npm audit in passing |

### Single-Source Ideas (worth noting, not prioritized)

| Idea | Source | Assessment |
|------|--------|------------|
| GSD state machine tool (protocol enforcement) | Gemini #1 | Interesting but high effort; dispatch table already serves this role |
| LSP-driven refactoring priority | Gemini #4 | Prompt-level change, low effort, independent of this upgrade |
| VLM-based visual UI feedback | Gemini #10 | Future capability; screenshot + multimodal already partially covers this |
| Context compaction tool | Gemini #5 | continue.md and session forensics already address this |
| Semantic conflict resolution | Gemini #9 | parallel-merge.ts exists; LSP-based merge is research-grade |

---

## Audit Feedback

### Claude Audit (claude.md)
**Strengths:** Grounded in actual file paths and line numbers. Priority table is clear and actionable. Meta-observation about "tools without loops" is the single best insight across all three audits.
**Gaps:** Doesn't address structured verification evidence (Codex's #5). Doesn't consider the supervisor upgrade path. Missing any mention of runtime stack contracts — assumes the agent already knows how to boot the app.

### Gemini Audit (gemini.md)
**Strengths:** Broadest scope. The parallel orchestration + semantic merge vision is architecturally ambitious and directionally correct. Research agent specialization is a good observation.
**Gaps:** Several recommendations ignore existing infrastructure. The "GSD state machine tool" (#1) reinvents what auto-dispatch.ts already does. The "context compactor" (#5) overlaps with existing continue.md and session-forensics.ts. The "env tool" (#8) is too generic — GSD's problem is runtime contract declaration, not environment repair. Some ideas (VLM, semantic merge) are research-grade and shouldn't be in a near-term upgrade path.

### Codex Audit (codex.md)
**Strengths:** Best structural analysis of the codebase. Correctly identifies that post-unit-hooks.ts is the right substrate for enforcement. The "structured verification evidence" proposal (#5) is the most forward-looking idea across all audits — it makes every subsequent autonomy improvement compound. Strongest "what not to change" section.
**Gaps:** Slightly conservative on git push/PR automation (doesn't mention it). The runtime stack contracts proposal (#6) is good but needs a concrete schema, not just bullet points.

---

## Decision: Phased Implementation Plan

### Design Principles

1. **Enforce, don't suggest.** Every quality loop must gate progression, not advise it.
2. **Evidence over prose.** Verification produces structured, machine-queryable proof blocks.
3. **Existing substrate first.** Build on post-unit-hooks, dispatch rules, and preferences — don't introduce new orchestration primitives.
4. **Solo-dev workflow.** No team coordination overhead. Lex + Claude Code only.

### Phase 1: Verification Enforcement (Highest leverage)

**Goal:** No task completes without verifiable evidence that it works.

#### 1A. Post-execution verification gate

A built-in post-unit hook that fires after every `execute-task` completion.

**Behavior:**
- Discovers verification commands from: (a) `verification_commands` preference, (b) task plan's `verify:` field, (c) package.json scripts (`typecheck`, `lint`, `test`)
- Runs each command, captures stdout/stderr, pass/fail
- On failure: re-dispatches execute-task with failure context (auto-fix loop, max 2 retries)
- On success: writes structured proof block to task summary

**New preference key:**
```yaml
verification_commands: ["npm run typecheck", "npm run lint"]
verification_auto_fix: true          # re-dispatch on failure (default: true)
verification_max_retries: 2          # cap retry loops (default: 2)
```

**Implementation surface:**
- `post-unit-hooks.ts` — add built-in `verify-after-execute` hook profile
- `auto-recovery.ts` — add retry path for verification failures
- `preferences.ts` — add `verification_commands`, `verification_auto_fix`, `verification_max_retries`
- `templates/task-summary.md` — add `## Verification Evidence` section

#### 1B. Structured verification evidence format

Every task summary, slice summary, and UAT result gains a `## Verification Evidence` block:

```markdown
## Verification Evidence

| Check | Command/Tool | Expected | Observed | Verdict |
|-------|-------------|----------|----------|---------|
| TypeScript | `npm run typecheck` | exit 0 | exit 0 | PASS |
| Lint | `npm run lint` | exit 0 | exit 0 | PASS |
| Unit tests | `npm test` | all pass | 47/47 pass | PASS |
| Browser smoke | `browser_assert` | login form visible | login form visible | PASS |
```

**Implementation surface:**
- `templates/task-summary.md` — add section
- `templates/slice-summary.md` — add section
- `observability-validator.ts` — validate evidence block presence and structure
- `auto-recovery.ts` — if evidence block missing, trigger verification hook

#### 1C. Runtime error capture

During browser verification or dev server execution, systematically capture and review:
- Server stderr/stdout from bg-shell processes
- Browser console errors via `browser_console`
- Unhandled promise rejections, deprecation warnings

**Implementation surface:**
- `prompts/execute-task.md` — add mandatory post-browser-check server log review instruction
- `post-unit-hooks.ts` — built-in `check-runtime-errors` hook that inspects active bg-shell output

---

### Phase 2: Executable UAT (Biggest autonomy gain)

**Goal:** Eliminate UAT pauses for everything the agent can verify itself.

#### 2A. New UAT types

Expand the UAT type enum from:
```
artifact-driven | live-runtime | human-experience | mixed
```
to:
```
artifact-driven | browser-executable | runtime-executable | human-judgment | mixed
```

**Dispatch behavior:**
| UAT Type | pauseAfterDispatch | Agent behavior |
|----------|-------------------|----------------|
| `artifact-driven` | `false` | Check file artifacts exist and contain expected content |
| `browser-executable` | `false` | Boot app, run browser flow, assert expected states, capture screenshots |
| `runtime-executable` | `false` | Run CLI commands, check outputs, verify API responses |
| `human-judgment` | `true` | Pause for subjective human review |
| `mixed` | `true` | Agent runs automatable checks, then pauses for human residual |

**Implementation surface:**
- `files.ts` — expand `UatType` union
- `auto-dispatch.ts:122` — update `pauseAfterDispatch` logic
- `templates/uat.md` — add structured executable sections for browser/runtime types
- `prompts/run-uat.md` — add browser flow execution instructions for new types

#### 2B. Executable UAT schema

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

#### 2C. `browser_verify_flow` tool

A higher-level browser tool that accepts a structured flow definition and returns PASS/FAIL with evidence.

**Input:** flow name, preconditions, ordered steps with assertions, retry policy, failure capture policy
**Output:** structured verdict, failed step index, assertion diff, debug bundle path, condensed explanation

**Implementation surface:**
- `browser-tools/tools/flow.ts` — new tool
- Composes existing primitives: `browser_navigate`, `browser_assert`, `browser_fill_form`, `browser_screenshot`
- Already proposed in `BROWSER-TOOLS-V2-PROPOSAL.md`

---

### Phase 3: Operational Automation (Friction removal)

**Goal:** Close the loop from code to production without manual ceremony.

#### 3A. Git push + draft PR on milestone completion

**Behavior:**
- After `complete-milestone`, if `git.auto_push` is true:
  - Push milestone branch to remote
  - Create draft PR with milestone summary as body via `gh pr create --draft`
  - Run `gh pr checks` and report status
- Preference-gated, draft-only, milestone-level only (not per-task)

**New preference key:**
```yaml
git:
  auto_push: true
  auto_pr: true           # create draft PR on milestone completion (default: false)
```

**Implementation surface:**
- `auto-dispatch.ts` — add post-milestone dispatch rule or hook
- `git-service.ts` — add push + PR creation functions
- `github-client.ts` — may already have PR primitives

#### 3B. Deploy-and-verify hook

A post-milestone hook that:
1. Triggers deployment via configured MCP (Railway, Vercel, etc.)
2. Polls for deployment readiness
3. Runs smoke tests against deployed URL (browser tools or curl)
4. Writes deployment verification evidence to milestone validation

**New preference key:**
```yaml
deploy:
  provider: railway          # railway | vercel | custom
  smoke_url: https://app.example.com
  smoke_checks: ["browser_verify_flow:login", "curl:health"]
```

**Implementation surface:**
- `post-unit-hooks.ts` — built-in `deploy-and-verify` hook profile
- Leverages existing MCP tools (railway_get_deployments, railway_get_logs)

#### 3C. Dependency security scan

Post-execution check: if `package.json` or `package-lock.json` changed, run `npm audit --audit-level=moderate`. Flag critical/high vulnerabilities in the verification evidence block. Don't block — warn.

**Implementation surface:**
- `post-unit-hooks.ts` — built-in `security-scan` hook
- Conditional: only fires when package manifest changes detected

---

### Phase 4: Supervisor Upgrade (Quality ceiling)

**Goal:** Smarter failure recovery through an active supervisor sidecar.

#### 4A. Active supervisor reasoning

Upgrade `auto-supervisor.ts` from timer-driven watchdog to bounded reasoning agent.

**Capabilities:**
- Inspect activity logs and last tool traces
- Check in-flight bg-shell processes for crashes
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

#### 4B. Runtime stack contracts

A `.gsd/RUNTIME.md` file that declares how to boot and verify the project:

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
```

The supervisor and UAT runner consume this contract instead of ad-hoc inference.

**Implementation surface:**
- `templates/runtime.md` — new template
- `prompts/execute-task.md` — inject runtime contract when present
- `prompts/run-uat.md` — inject runtime contract for browser-executable UAT

---

## What NOT To Build

| Proposal | Source | Why not |
|----------|--------|---------|
| GSD state machine tool | Gemini #1 | auto-dispatch.ts already serves this role; adding another abstraction layer increases complexity without clear benefit |
| Semantic merge via LSP | Gemini #9 | Research-grade; parallel-merge.ts already handles the common cases; LSP rename across conflicting branches is unsolved in industry |
| VLM-based visual feedback | Gemini #10 | Multimodal screenshot review already works in current Claude; a dedicated VLM tool adds latency and cost for marginal gain |
| Context compaction tool | Gemini #5 | continue.md + session-forensics.ts already handle this; context pressure is a model-level concern, not a tool gap |
| Generic env repair tool | Gemini #8 | Too broad; runtime stack contracts (Phase 4B) solve the specific problem without a general-purpose env manager |
| Parallel milestone orchestration | Gemini #6 | parallel-orchestrator.ts and parallel-eligibility.ts already exist; the gap is in verification, not parallelism |

---

## Implementation Sequence

```
Phase 1 (Verification)     ████████░░░░  ~2-3 sessions
  1A. Verification gate     ████
  1B. Evidence format       ██
  1C. Runtime error capture ██

Phase 2 (Executable UAT)   ████████░░░░  ~2-3 sessions
  2A. New UAT types         ████
  2B. Executable schema     ██
  2C. browser_verify_flow   ████

Phase 3 (Ops Automation)   ██████░░░░░░  ~2 sessions
  3A. Git push + PR         ██
  3B. Deploy-and-verify     ████
  3C. Security scan         █

Phase 4 (Supervisor)       ██████░░░░░░  ~2 sessions
  4A. Active supervisor     ████
  4B. Runtime contracts     ██
```

Each phase is independently valuable. Phase 1 is prerequisite for Phase 2 (verification evidence format feeds executable UAT). Phases 3 and 4 are independent of each other and can run in parallel.

---

## Success Criteria

| Metric | Before | After Phase 1 | After Phase 2 | After All |
|--------|--------|---------------|---------------|-----------|
| Tasks with verified evidence | ~30% (prompt-dependent) | ~95% (enforced) | ~95% | ~98% |
| UAT pauses requiring human | ~70% of web UATs | ~70% | ~20% (only human-judgment) | ~15% |
| Broken-test commits | occasional | near-zero | near-zero | near-zero |
| Manual git ceremony per milestone | push + PR + check | push + PR + check | push + PR + check | zero |
| Local→prod verification gap | untracked | untracked | untracked | closed |

---

## Open Questions

1. **Verification command discovery:** Should the default verification commands be auto-detected from package.json scripts, or always require explicit preference configuration? Auto-detect is more ergonomic but less predictable.

2. **browser_verify_flow scope:** Should this be a GSD-specific tool or a general browser-tools extension tool? GSD-specific keeps it focused; general makes it useful outside GSD.

3. **Deploy provider abstraction:** Is it worth abstracting across Railway/Vercel/custom, or should Phase 3B just target Railway (the current MCP) and generalize later?

4. **Supervisor model cost:** The active supervisor fires a reasoning pass on every timeout event. Should it use a cheaper model (Haiku) for initial triage and escalate to a stronger model only when needed?
