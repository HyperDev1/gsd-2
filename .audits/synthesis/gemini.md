# GSD 2 Agency Upgrade: The "Autonomous Engineering System" (PRD/ADR)

**Date:** 2026-03-16  
**Status:** PROPOSED  
**Auditors:** Claude 4.6, Codex GPT-5, Gemini 2.0

## 1. Executive Summary

GSD 2 has matured beyond a simple coding assistant. To reach the next level of agency and autonomy, the system must shift from **prompt-guided execution** to **enforced runtime policy**. This upgrade focuses on replacing manual reasoning with structured, verifiable, and parallelizable loops.

The goal is to move GSD from "performing tasks" to "delivering verified outcomes" with minimal human intervention.

---

## 2. Core Pillars of the Upgrade

### Pillar 1: Enforced Verification Gating (The "Gatekeeper")
**Problem:** The agent currently "proves" its work through prose in summaries, which is subjective and brittle.  
**Solution:** Implement a mandatory pre-completion verification engine.
- **Structured Evidence:** All tasks must produce a `VERIFICATION.json` (or block in summary) containing machine-readable pass/fail results for:
  - **Static Analysis:** LSP diagnostics, type-checks, and linting.
  - **Behavioral Analysis:** Unit/Integration tests and browser assertions.
- **Enforcement:** The `gsd` tool will refuse to mark a task as "Done" if the verification evidence is missing or contains failures.

### Pillar 2: Deterministic Runtime Contracts (`.gsd/RUNTIME.md`)
**Problem:** The agent spends excessive tokens "guessing" how to start, seed, and observe the application.  
**Solution:** Formalize the agent's relationship with the app environment.
- **Contract Declaration:** A structured file declaring:
  - `start_command`, `readiness_check` (URL or log pattern), `seed_data_command`.
  - `preview_url_template`, `log_monitor_patterns`.
- **Higher-Level Tooling:** A `runtime` tool that consumes this contract to handle environment setup and state monitoring automatically.

### Pillar 3: Automated Browser-First UAT
**Problem:** Non-artifact UAT currently pauses for human review, creating significant friction.  
**Solution:** Upgrade the UAT protocol to be "agent-executable" by default.
- **`browser-verified` Class:** A new UAT type that uses a high-level `browser_verify_flow` tool to execute multi-step assertions (e.g., "Login -> Navigate to Dashboard -> Verify Widget Presence").
- **Evidence Collection:** Automatic capture of HAR files, screenshots, and console logs as part of the UAT result.
- **Pause-on-Subjective:** Only pause for "Human Judgment" tasks (e.g., "does this animation feel smooth?").

### Pillar 4: Structured Protocol Tooling (`gsd` Tool)
**Problem:** Manual markdown manipulation of `STATE.md` and task plans is token-expensive and error-prone.  
**Solution:** Provide a specialized tool for GSD state management.
- **Functions:** `gsd.start_task(id)`, `gsd.update_plan(id, updates)`, `gsd.verify_task(id, evidence)`, `gsd.complete_task(id)`.
- **Benefit:** Reduces protocol drift and allows the agent to focus on *engineering* rather than *bookkeeping*.

### Pillar 5: Parallel Milestone Orchestration
**Problem:** GSD executes tasks serially, limiting its speed on large projects.  
**Solution:** Turn the agent into a "Project Manager" for parallel work.
- **Worktree-Isolated Sub-agents:** Spawn independent sub-agents for non-conflicting slices (verified via dependency tags).
- **Milestone Manager:** A specialized reasoning loop to coordinate merges and resolve semantic conflicts using LSP-aware merging logic.

---

## 3. Technical Implementation Strategy (ADR)

### ADR-004.1: The Verification Engine
- **Mechanism:** Utilize the `post_unit_hooks` infrastructure.
- **Defaults:** Every project should have a default `verify` hook that runs `npm run lint` and `npm run typecheck` if relevant files are present.
- **Output:** All verification logs must be saved to `.gsd/logs/verification/{task_id}.log`.

### ADR-004.2: Runtime Stack Contracts
- **Format:** Markdown with YAML frontmatter for machine readability.
- **Location:** `.gsd/RUNTIME.md`.
- **Tooling:** A `bg_shell` wrapper that uses the contract to ensure the "ready" state before passing control back to the agent.

### ADR-004.3: Active Supervisor Sidecar
- **Role:** A separate, low-temperature LLM call triggered on "Stall Detectors" (e.g., 3 turns with no filesystem changes, tool timeout).
- **Capability:** Read the last 5 tool traces and provide a "Recovery Brief" (e.g., "The server is failing to start because of port 3000; try using port 3001").

---

## 4. Success Metrics

1. **Autonomy Ratio:** Percentage of milestones completed without a single human pause. Target: >80% for web/API projects.
2. **Defect Leakage:** Number of lint/type/test errors found in human review vs. caught by the agent. Target: <5%.
3. **Execution Speed:** Wall-clock time reduction for large milestones via parallelism. Target: 2x - 3x improvement.
4. **Protocol Compliance:** reduction in "protocol drift" errors (e.g., missing summary, wrong state). Target: 0 errors.

---

## 5. Timeline & Sequencing

1. **Phase 1 (Verification):** Enforced lint/typecheck gates + `VERIFICATION.json` structure.
2. **Phase 2 (Interaction):** `.gsd/RUNTIME.md` and automated browser flow verification.
3. **Phase 3 (Orchestration):** Parallel slice execution and Milestone Manager.
4. **Phase 4 (Refinement):** Active Supervisor sidecar and VLM UI verification.
