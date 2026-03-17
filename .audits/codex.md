# GSD 2 Agency Audit

**Date:** 2026-03-16  
**Auditor:** Codex GPT-5

## Thesis

GSD 2 already has unusually strong primitives for an autonomous coding agent:

- fresh-session auto orchestration in `src/resources/extensions/gsd/auto.ts`
- explicit dispatch rules in `src/resources/extensions/gsd/auto-dispatch.ts`
- artifact and recovery gates in `src/resources/extensions/gsd/auto-recovery.ts`
- browser interaction and assertion tools in `src/resources/extensions/browser-tools/`
- long-running execution surfaces in `src/resources/extensions/bg-shell/` and `src/resources/extensions/async-jobs/`
- configurable hook points in `src/resources/extensions/gsd/post-unit-hooks.ts`

The main limitation is not lack of tools. It is that many of the most important quality loops are still expressed as prompt guidance and markdown prose instead of enforced runtime policy.

If I were optimizing for more agency without lowering quality, I would push in this order.

---

## 1. Turn Verification From Prompt Advice Into Enforced Policy

### Why this is the highest-leverage gap

The system prompt and execution prompt strongly tell the agent to verify:

- `src/resources/extensions/gsd/prompts/system.md`
- `src/resources/extensions/gsd/prompts/execute-task.md`

But the runtime mostly enforces artifact existence, not proof quality:

- `verifyExpectedArtifact()` checks that summaries, plans, UAT results, and checkboxes exist in `src/resources/extensions/gsd/auto-recovery.ts`
- `observability-validator.ts` validates plan and summary structure, but not whether the verification commands actually ran or passed

That means the agent can satisfy the protocol while still under-verifying.

### Recommendation

Add a first-class verification policy engine that runs after `execute-task` and before the task is considered complete.

The policy should support:

- mandatory diagnostics: `lsp diagnostics`, compiler, typecheck, lint
- task-specific commands from task/slice plan verification sections
- browser assertions for UI work
- observability checks for tasks that declare observability surfaces
- structured pass/fail evidence written to disk

### Best implementation path

Use the existing post-unit hook system in `post-unit-hooks.ts` as the substrate, but make verification a built-in default path rather than an advanced user configuration.

### Why this increases quality

It shifts completion from "agent said it verified" to "system saw verifiable evidence."

---

## 2. Upgrade UAT From Mostly Human-Paused To Mostly Agent-Executable

### Current state

`run-uat` is only fully autonomous for `artifact-driven` UAT:

- `checkNeedsRunUat()` in `src/resources/extensions/gsd/auto-prompts.ts`
- `pauseAfterDispatch: uatType !== "artifact-driven"` in `src/resources/extensions/gsd/auto-dispatch.ts`
- non-artifact UAT pauses auto-mode in `src/resources/extensions/gsd/auto.ts`

The current prompt for non-artifact UAT explicitly surfaces it for human review:

- `src/resources/extensions/gsd/prompts/run-uat.md`

But the repo already has a much richer runtime surface than that policy assumes:

- `browser_assert`, `browser_diff`, `browser_batch`, `browser_fill_form`, `browser_emulate_device`, `browser_extract`, `browser_visual_diff`
- `browser_trace_start/stop`, `browser_export_har`, `browser_debug_bundle`
- `bg_shell` and `async_jobs` for standing up the app and observing it

### Recommendation

Split UAT into more precise classes:

- `artifact-driven`
- `browser-executable`
- `runtime-executable`
- `mixed`
- `human-judgment`

Then only pause for the last two when a subjective human judgment is genuinely required.

### Best implementation path

Add an executable UAT schema instead of only prose in `templates/uat.md`, for example:

- preconditions
- server command or process dependency
- browser flow steps
- assertions
- failure artifact policy
- human-only residual checks

### Why this increases quality

More of the acceptance loop becomes repeatable and evidence-backed, while the system still explicitly marks what remains unproven.

---

## 3. Add Flow-Level Browser Verification, Not Just Primitive Assertions

### Current state

Browser tools are already strong:

- explicit assertions in `src/resources/extensions/browser-tools/tools/assertions.ts`
- session timeline and debug artifacts in `src/resources/extensions/browser-tools/tools/session.ts`
- semantic helpers in `src/resources/extensions/browser-tools/tools/intent.ts`

But they are still mostly a toolkit of local actions. The missing higher-level capability is already named in your own proposal:

- `browser_verify_flow` appears in `src/resources/extensions/browser-tools/BROWSER-TOOLS-V2-PROPOSAL.md`
- `browser_recommend_next` and `browser_run_task` are also proposed there but not implemented

### Recommendation

Implement `browser_verify_flow` first.

It should accept:

- a flow name
- preconditions
- ordered steps
- explicit assertions
- retry policy
- artifact capture policy on failure

And it should return:

- structured PASS/FAIL
- which step failed
- the assertion failure
- a debug bundle path
- a condensed explanation safe to inline into task summaries or UAT results

### Why this increases quality

It reduces prompt fragility. Right now the agent must manually compose many browser calls correctly each time. A flow verifier would make web verification much more deterministic and much cheaper in tokens.

---

## 4. Make the Supervisor an Active Recovery Agent, Not Just a Timeout Watchdog

### Current state

The supervision model is mostly:

- soft timeout
- idle timeout
- hard timeout
- filesystem activity detection
- retry / skip / placeholder recovery

See:

- `src/resources/extensions/gsd/auto.ts`
- `src/resources/extensions/gsd/auto-supervisor.ts`
- `src/resources/extensions/gsd/auto-recovery.ts`

This is good operational hygiene, but it is still mostly timer-driven.

Also worth noting: `auto_supervisor.model` exists in preferences but does not appear to drive a separate supervisor agent path in the runtime right now:

- `src/resources/extensions/gsd/preferences.ts`

### Recommendation

Promote the supervisor into an actual sidecar reasoning loop with bounded authority.

That sidecar should be able to:

- inspect activity logs and last tool traces
- look at in-flight jobs and server output
- decide whether the unit is truly stuck versus just long-running
- redirect the main agent with a sharper recovery brief
- trigger a verifier or critic sub-pass before deciding to skip

### Guardrails

Do not let the supervisor silently take irreversible actions. Its authority should be limited to:

- inject recovery context
- run diagnostics
- request one more bounded retry
- downgrade to blocker / skip with explicit evidence

### Why this increases quality

Right now recovery is operationally competent but shallow. A smarter supervisor would improve both autonomy and failure handling.

---

## 5. Make Verification Evidence Structured and Machine-Consumable

### Current state

Task and slice summaries have frontmatter and narrative sections:

- `src/resources/extensions/gsd/templates/task-summary.md`
- `src/resources/extensions/gsd/templates/slice-summary.md`

This is useful, but the critical verification payload is still mostly freeform prose.

Milestone validation is therefore largely document reconciliation:

- `src/resources/extensions/gsd/prompts/validate-milestone.md`
- `src/resources/extensions/gsd/templates/milestone-validation.md`

### Recommendation

Add a structured verification block to task summaries, slice summaries, and UAT results. For example:

- checks
- command or tool used
- expected condition
- observed result
- verdict
- artifact paths
- timestamp

### Why this matters

Once verification becomes structured:

- milestone validation can trust evidence instead of prose
- future replanning can query proof gaps directly
- the system can distinguish "artifact exists" from "feature truly proved"
- regressions become auditable

This is a major autonomy multiplier because it lets later agents reason over prior evidence without rereading whole narratives.

---

## 6. Add First-Class Runtime Stack Contracts

### Current state

The system has strong primitives for background processes:

- `src/resources/extensions/bg-shell/index.ts`
- `src/resources/extensions/async-jobs/index.ts`

But starting the right stack is still largely prompt-driven and repo-specific. The agent has to infer:

- how to boot the app
- what indicates readiness
- which ports matter
- which logs are noise versus failure
- how to seed required state

### Recommendation

Introduce a project-level runtime contract file, something like `.gsd/RUNTIME.md` or a structured frontmatter variant, that declares:

- startup commands
- readiness checks
- required services
- seed/reset commands
- preview URLs
- recommended browser entrypoints
- stable observability commands

Then expose a higher-level runtime tool or helper that consumes that contract.

### Why this increases quality

This removes a large amount of ad hoc reasoning and makes runtime verification repeatable. It is especially useful for UI work, distributed services, and anything involving watchers or background processes.

---

## 7. Productize Default Verifier / Critic Sidecars Through Hooks

### Current state

You already have the right infrastructure:

- `post_unit_hooks`
- `pre_dispatch_hooks`
- retry-on-artifact behavior
- model overrides for hooks

All of that lives in `src/resources/extensions/gsd/post-unit-hooks.ts` and `src/resources/extensions/gsd/preferences.ts`.

### Recommendation

Ship opinionated built-in hook profiles instead of expecting advanced users to invent them.

Examples:

- `verify-after-execute-task`
- `review-before-complete-slice`
- `browser-smoke-after-ui-task`
- `diagnostics-check-before-marking-done`

These should be easy to enable in preferences, but ideally one good default should already exist.

### Why this increases quality

This gives you parallel scrutiny without bloating the main execution prompt. It is one of the cleanest ways to raise agency while preserving output quality.

---

## 8. Add Capability Acquisition as a Controlled Runtime Behavior

### Current state

GSD already supports:

- skill discovery and optional auto-install in research prompts via `buildSkillDiscoveryVars()` in `src/resources/extensions/gsd/auto-prompts.ts`
- marketplace and MCP metadata discovery in:
  - `src/resources/extensions/gsd/marketplace-discovery.ts`
  - `src/resources/extensions/gsd/plugin-importer.ts`
  - `src/resources/extensions/mcporter/index.ts`

But capability acquisition is still mostly a planning-time or user-mediated flow.

### Recommendation

Give the agent a controlled way to acquire missing capabilities during execution, with policy boundaries.

Good candidates:

- install a directly relevant skill
- enable a known MCP server
- import a marketplace plugin that adds a needed read-only or test-only capability

### Guardrails

Require all of:

- explicit allowlist
- reversible install path
- provenance logging
- no outward-facing side effects
- no secret escalation

### Why this increases quality

A more capable agent with the right tools is often safer than an underpowered agent improvising around missing tools.

---

## 9. Push Beyond Localhost: Add Preview / Staging Verification Loops

### Current state

The repo docs explicitly describe remote execution override patterns:

- `docs/extending-pi/18-remote-execution-tool-overrides.md`

And the current system already reasons well about local verification and browser checks. What is missing is a first-class path from "built locally" to "verified in preview or staging."

### Recommendation

Add a preview verification unit or post-milestone hook that can:

- deploy to preview or staging
- wait for readiness
- run smoke flows and assertions
- harvest logs and screenshots on failure
- write a durable report back into `.gsd`

### Why this increases quality

This is the cleanest way to increase autonomy on real product work without jumping straight to risky production actions.

---

## What I Would Not Change

Some current choices are already correct and should remain:

- fresh session per unit in `auto.ts`
- artifact gating and recovery in `auto-recovery.ts`
- disk-first state model
- explicit browser assertions over screenshot-only heuristics
- worktree-based isolation
- conservative handling of non-executable UAT

The goal is not "let the agent do anything." The goal is "let the agent close more loops itself with better evidence."

---

## Priority Order

If I were sequencing this for maximum payoff:

1. Enforced verification policy after `execute-task`
2. Executable UAT classes and less pausing
3. `browser_verify_flow`
4. Structured verification evidence in summaries/UAT
5. Built-in verifier / critic hook profiles
6. Active supervisor sidecar
7. Runtime stack contracts
8. Controlled capability acquisition
9. Preview / staging verification

---

## Bottom Line

The next big leap for GSD 2 is not more raw power. You already have most of that. The next leap is converting existing powers into reusable, enforced, evidence-producing loops.

That is the path to more agency and better quality at the same time.
