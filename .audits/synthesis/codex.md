# GSD Agency Upgrade Synthesis (PRD/ADR)

**Date:** 2026-03-16  
**Status:** Proposed  
**Source audits:** `.audits/claude.md`, `.audits/gemini.md`, `.audits/codex.md`

## Executive Summary

All three audits identify the same underlying constraint:

> GSD already has strong autonomy primitives, but too many important loops still depend on prompt compliance instead of enforced runtime policy.

The right upgrade is not "give the agent more raw power." The right upgrade is to make GSD close more loops itself, with durable evidence, while preserving the things that are already correct:

- fresh-session execution
- disk-first state and artifacts
- worktree isolation
- explicit browser assertions
- conservative recovery and UAT behavior

This synthesis recommends an **evidence-first agency upgrade** built on the current GSD control plane. It extends existing dispatch, hook, browser, runtime, and recovery systems instead of replacing them with a second orchestration layer.

---

## Feedback On The Audit Documents

### `.audits/claude.md`

**What it gets right**

- Best leverage ranking. It correctly identifies enforced verification, executable browser-backed UAT, and post-execution test loops as the highest-payoff gaps.
- Good fit with the current codebase. Its recommendations map cleanly onto existing surfaces such as `post-unit-hooks.ts`, `auto-dispatch.ts`, and the browser toolchain.
- Strongest core insight: the missing piece is not tools, it is structural loops that force the agent to use them before progressing.

**What needs refinement**

- It mixes core autonomy architecture with optional ops integrations. Items like dependency audit, deploy loops, and PR creation are useful, but they should not sit in the same priority tier as verification gating.
- "Browser-verified" is directionally right, but the real change should be a broader executable UAT model, not a single extra string in the enum.
- Deployment verification should target preview/staging first. Production deployment should remain explicitly bounded and opt-in.

**How to use it**

- Treat items 1, 2, 3, and 6 as core product requirements.
- Treat items 4, 5, and 7 as optional integrations after the verification substrate exists.

### `.audits/gemini.md`

**What it gets right**

- Strong product vision. It describes the "fully autonomous engineering system" aspiration clearly.
- The runtime contract idea is valuable and should be adopted.
- It correctly spots the need for better persistent runtime interaction, log monitoring, context compaction, and higher-level browser semantics.

**What needs refinement**

- It over-prescribes new top-level tools. A new `gsd` tool, `verify` tool, `env` tool, and `merge` tool would duplicate or fragment capabilities that already exist across GSD state, hooks, browser tools, runtime records, DB helpers, and worktree orchestration.
- It describes parallelism as a missing capability, but milestone-level parallel orchestration already exists in `parallel-orchestrator.ts`.
- Semantic merge and VLM-based UI critique are interesting, but they are not first-order blockers to agency today.

**How to use it**

- Keep its product vocabulary and broader ambition.
- Reframe most of its proposals as productization of existing extension surfaces rather than net-new control-plane primitives.

### `.audits/codex.md`

**What it gets right**

- Best architectural fit. It grounds recommendations in actual repo surfaces and respects GSD's current design constraints.
- It correctly keeps the disk-first model, worktree isolation, explicit browser assertions, and conservative UAT stance.
- It draws the right line between "tooling exists" and "system enforces use of tooling."

**What needs refinement**

- It is the best architecture memo, but not yet a complete product definition.
- It should be more explicit about user-visible outcomes, rollout sequence, and what should not be built.
- It needs a sharper canonical evidence model so future implementation does not split between prose, frontmatter, runtime JSON, and ad hoc logs.

**How to use it**

- Use it as the architectural base document.
- Layer Claude's prioritization and Gemini's product framing on top.

---

## Cross-Audit Synthesis

The audits converge on a single thesis:

1. GSD does not primarily need more primitives.
2. GSD primarily needs enforced, reusable, evidence-producing loops.
3. The upgrade should extend the current GSD runtime rather than replace it.

That leads to one architectural direction:

**Upgrade GSD from prompt-guided autonomy to evidence-closed autonomy.**

In practical terms, that means:

- a unit is not done because the agent says it is done
- a unit is done when GSD has machine-readable proof that the required checks passed
- UAT pauses only when human judgment is genuinely required
- runtime startup, readiness, and observability become declared contracts instead of fresh inference on every task
- browser verification operates at flow level, not only primitive assertion level
- the supervisor becomes a bounded diagnostic sidecar, not just a timeout watchdog

---

## Current Reality Check

Before changing architecture, the repo should be treated accurately:

- GSD already has real runtime enforcement for dispatch, artifact verification, recovery, hooks, runtime records, and milestone-level parallel orchestration.
- Browser verification is also ahead of some proposal language: `browser_assert`, `browser_diff`, and `browser_batch` are already shipped.
- The biggest implementation gaps are productization gaps: non-artifact UAT is still prompt-led, must-have coverage is measured more than enforced, and some preference surfaces appear only partially wired.
- Some proposal documents are stale relative to shipped code, especially the browser-tools proposal. Phase 0 of this upgrade should include documentation reconciliation so future design work starts from reality.

---

## PRD

## Product Name

**GSD Agency Upgrade: Evidence-Closed Autonomy**

## Problem Statement

GSD can already plan, execute, recover, parallelize, and verify more than most coding-agent systems. The limiting factor is that several critical loops are still socially enforced by prompts rather than mechanically enforced by runtime policy:

- execution summaries can overstate proof
- UAT pauses too early for web work that the agent can already exercise
- runtime setup is repeatedly inferred instead of declared
- browser verification is still too manual at the flow level
- supervision detects timeouts but does not reason deeply about recovery

This creates avoidable human pauses, defect leakage, and repeated token waste.

## Goals

- Make verification evidence mandatory for task and slice completion.
- Reduce human pauses for web and runtime-backed work.
- Preserve GSD's disk-first, inspectable artifact model.
- Turn runtime behavior into declared contracts instead of repeated inference.
- Give supervisors bounded diagnostic agency before escalating to humans.
- Extend autonomy safely into preview/staging validation and optional repo operations.

## Non-Goals

- Replacing markdown planning artifacts with an opaque state machine.
- Default autonomous production deployment.
- Default VLM-based aesthetic judgment as a release gate.
- Making semantic merge a phase-one dependency.
- Replacing existing browser primitives with speculative black-box automation.

## Primary Users

- Solo builders who want GSD to finish more work without pausing.
- Teams who want stronger evidence and lower review friction.
- Web/app builders whose current UAT pauses are mostly mechanical, not subjective.

## Product Pillars

### 1. Verification Policy Engine

Every `execute-task` and `complete-slice` unit must produce canonical verification evidence before completion is accepted.

**Required evidence classes**

- static: diagnostics, typecheck, lint
- behavioral: tests, command assertions, browser assertions
- integration: slice-level verification from the slice plan
- observability: logs, error surfaces, readiness checks when relevant

**Product behavior**

- ship a built-in default verifier profile
- allow project overrides through preferences
- fail closed when required evidence is missing

### 2. Executable UAT

UAT should default to agent-executable where possible.

**New UAT classes**

- `artifact-driven`
- `browser-executable`
- `runtime-executable`
- `mixed`
- `human-judgment`

**Rules**

- `artifact-driven`, `browser-executable`, and `runtime-executable` do not pause by default
- `mixed` pauses only for the residual human-only checks
- `human-judgment` pauses immediately with a clear handoff

### 3. Runtime Contracts

Projects may define `.gsd/RUNTIME.md` as the canonical runtime contract for standing up, resetting, and observing the app.

**Contract fields**

- startup commands
- readiness checks
- dependent services
- seed/reset commands
- preview URL or entrypoints
- observability commands
- browser entry routes

### 4. Browser Flow Verification

Add a higher-level browser verification surface that composes existing browser primitives into deterministic flows.

**Core additions**

- `browser_verify_flow`
- `browser_export_verification_report`

**Backed by existing primitives**

- `browser_assert`
- `browser_batch`
- `browser_diff`
- trace, HAR, console, and screenshot tooling

### 5. Supervisor Sidecar

Promote supervision from timeout monitoring into bounded diagnostic reasoning.

**Allowed powers**

- inspect activity logs, runtime records, and recent tool traces
- inspect server output and in-flight jobs
- run bounded diagnostics
- produce a recovery brief
- request one bounded retry
- escalate with evidence

**Disallowed powers**

- silent destructive actions
- silent scope changes
- autonomous production-side effects

### 6. Preview / Staging Verification

GSD should support deploy-and-verify loops against preview or staging environments behind explicit configuration.

**Outcomes**

- deploy to preview/staging
- wait for readiness
- run smoke flows
- capture logs and artifacts
- write a durable verification report

### 7. Optional Repo Operations

After core evidence loops exist, GSD may optionally automate:

- milestone branch push
- draft PR creation
- PR summary generation

These should remain opt-in and occur only at milestone boundaries.

## Success Metrics

- `execute-task` units with machine-readable evidence: target 100%
- web slices completed without manual UAT pause: target >80%
- defects found after GSD claimed completion: reduce materially from current baseline
- timeout recoveries that resolve without human intervention: increase materially
- milestone validation relying on structured evidence instead of prose-only summaries: target 100%

---

## ADR

## Context

Current GSD already includes the right architectural substrate:

- dispatch policy in `src/resources/extensions/gsd/auto-dispatch.ts`
- artifact and recovery gates in `src/resources/extensions/gsd/auto-recovery.ts`
- runtime records in `src/resources/extensions/gsd/unit-runtime.ts`
- raw activity capture in `src/resources/extensions/gsd/activity-log.ts`
- configurable post-unit and pre-dispatch hooks in `src/resources/extensions/gsd/post-unit-hooks.ts`
- browser assertion and batching primitives in `src/resources/extensions/browser-tools/`
- milestone-level parallel orchestration in `src/resources/extensions/gsd/parallel-orchestrator.ts`

The missing layer is productized policy, not fundamental capability.

## Decision

Implement the agency upgrade by extending the existing GSD control plane with:

1. built-in verification policy profiles
2. executable runtime and UAT contracts
3. composite browser flow verification
4. structured evidence sidecars
5. bounded supervisor reasoning
6. preview/staging verification hooks

Do **not** replace the disk-first markdown artifact model with a mandatory opaque `gsd` state machine tool.

## Architectural Decisions

### ADR-1: Keep Markdown As The Human Contract; Add JSON As The Machine Proof

**Decision**

- keep task summaries, slice summaries, and UAT results as markdown
- add adjacent structured evidence artifacts as the canonical machine-readable proof

**Proposed artifact pattern**

- `T01-SUMMARY.md` remains the human summary
- `T01-VERIFY.json` becomes the canonical verification evidence
- `S01-UAT-RESULT.md` remains the human-facing result
- `S01-UAT-RESULT.json` stores structured checks and evidence references

**Why**

- preserves inspectability and diffability
- avoids overloading markdown parsers with machine-only structure
- gives milestone validation and future agents a reliable proof surface

### ADR-2: Productize Hooks Before Adding New Top-Level Tools

**Decision**

- use `post-unit-hooks.ts` and `pre-dispatch-hooks.ts` as the primary extension points for verification and critique sidecars
- ship opinionated built-in profiles instead of relying on user-authored hooks for core quality gates

**Why**

- aligns with current runtime
- minimizes new orchestration complexity
- lets advanced users override behavior without forking the architecture

### ADR-3: Replace Coarse UAT Types With Executable Contracts

**Decision**

- extend the current four-value UAT enum into a richer executable classification
- evolve `templates/uat.md` and `prompts/run-uat.md` so GSD can run most UAT directly

**Why**

- the current pause rule in `auto-dispatch.ts` is too coarse
- the browser and runtime surfaces already support richer execution than the current policy allows

### ADR-4: Use Runtime Contracts, Not Ad Hoc Runtime Guessing

**Decision**

- introduce `.gsd/RUNTIME.md` as a declared contract
- build runtime helpers around existing `bg-shell` / async execution surfaces instead of inventing a separate environment tool first

**Why**

- reduces repetitive reasoning
- improves reproducibility
- creates a reliable base for browser UAT, smoke tests, and preview validation

### ADR-5: Make The Supervisor A Bounded Sidecar

**Decision**

- the supervisor gains diagnostic reasoning authority
- it does not become a second autonomous executor

**Why**

- preserves traceability and safety
- improves recovery quality without introducing hidden behavior

### ADR-6: Limit Default Autonomy To Safe Operational Boundaries

**Decision**

- preview/staging verification: supported
- production deployment: not default, explicit opt-in only
- repo push / draft PR creation: opt-in, milestone-only

**Why**

- matches GSD's current conservative safety posture
- avoids conflating quality automation with irreversible operations

## Rejected Or Deferred Alternatives

### Rejected: Mandatory `gsd` state-machine tool as the primary protocol surface

Reason:

- would create a second source of truth beside markdown and runtime state
- weakens inspectability
- does not solve the real issue, which is policy enforcement

### Rejected: Prompt-only improvements without runtime enforcement

Reason:

- the repo already demonstrates that prompt guidance alone is insufficient for strong closure

### Deferred: Semantic merge as a near-term dependency

Reason:

- parallel orchestration already exists
- conflict resolution quality matters, but it is not the first blocker to agency gain

### Deferred: VLM-based aesthetic verification as a default gate

Reason:

- useful for later UX polish
- too subjective and noisy to anchor core completion policy

---

## Rollout Plan

### Phase 1: Evidence Gate

- reconcile stale proposal/docs with shipped capability so the implementation plan starts from the real baseline
- wire currently partial preference surfaces before adding new ones
- add built-in verifier profiles
- add `*-VERIFY.json` artifacts
- make completion depend on evidence presence and verdict
- update milestone validation to consume structured proof

**Likely file surface**

- `src/resources/extensions/gsd/post-unit-hooks.ts`
- `src/resources/extensions/gsd/preferences.ts`
- `src/resources/extensions/gsd/auto-recovery.ts`
- `src/resources/extensions/gsd/unit-runtime.ts`
- `src/resources/extensions/gsd/templates/task-summary.md`
- `src/resources/extensions/gsd/templates/slice-summary.md`
- `src/resources/extensions/gsd/templates/milestone-validation.md`

### Phase 2: Runtime + Executable UAT

- introduce `.gsd/RUNTIME.md`
- extend UAT schema and type system
- reduce pause behavior to only mixed/human-judgment flows

**Likely file surface**

- `src/resources/extensions/gsd/files.ts`
- `src/resources/extensions/gsd/templates/uat.md`
- `src/resources/extensions/gsd/prompts/run-uat.md`
- `src/resources/extensions/gsd/auto-dispatch.ts`
- `src/resources/extensions/gsd/auto-prompts.ts`

### Phase 3: Browser Flow Verification

- implement `browser_verify_flow`
- implement verification report export
- teach GSD to call these for executable UAT and UI-heavy tasks

**Likely file surface**

- `src/resources/extensions/browser-tools/index.ts`
- `src/resources/extensions/browser-tools/tools/assertions.ts`
- new browser tool modules for flow execution/report export
- `src/resources/extensions/gsd/prompts/execute-task.md`

### Phase 4: Supervisor Sidecar

- upgrade stall recovery from timer-driven to evidence-driven diagnosis
- allow supervisor-authored recovery briefs and bounded retries

**Likely file surface**

- `src/resources/extensions/gsd/auto.ts`
- `src/resources/extensions/gsd/auto-supervisor.ts`
- `src/resources/extensions/gsd/activity-log.ts`
- `src/resources/extensions/gsd/unit-runtime.ts`

### Phase 5: Preview Verification + Optional Repo Ops

- add preview/staging verification hooks
- optionally automate push + draft PR creation
- optionally expose controlled capability acquisition behind allowlists

**Likely file surface**

- `src/resources/extensions/gsd/github-client.ts`
- `src/resources/extensions/gsd/auto-worktree.ts`
- `src/resources/extensions/gsd/marketplace-discovery.ts`
- `src/resources/extensions/gsd/plugin-importer.ts`

---

## Bottom Line

The best agency upgrade for GSD is not a new control plane. It is a stricter, more productized version of the one that already exists.

The winning move is to turn current primitives into **mandatory, composable, evidence-producing loops**:

- verify before claiming done
- execute UAT when it is actually executable
- declare runtime expectations once
- verify browser flows at the flow level
- let the supervisor diagnose before escalating
- keep humans for judgment, not for mechanical proof
