# GSD Agent Autonomy Audit

**Date:** 2026-03-16
**Auditor:** Claude Opus 4.6

## Scope

Audit of the GSD-2 system for high-leverage areas where agent autonomy and self-verification can be increased while maintaining or improving quality.

---

## 1. Self-Linting / Type-Check Gate (Highest Leverage)

Agents commit code and move on. There is no automated feedback loop where the agent runs `tsc`, `eslint`, or the project's lint command and reacts to failures before marking a task done.

**Recommendation:** Add a post-execution, pre-summary verification step in `execute-task.md` that runs the project's lint/typecheck commands (discoverable from `package.json` scripts or a `.gsd/preferences` key). If they fail, the agent fixes before writing the task summary. Zero subjectivity — catches a whole class of errors that currently leak into UAT or human review.

**Implementation:** Add a `verification_commands` preference (e.g., `["npm run typecheck", "npm run lint"]`) and inject them into the execute-task prompt as mandatory pre-summary checks.

---

## 2. Upgrade Non-Artifact UAT to Agent-Driven Where Possible

The current split is binary: `artifact-driven` runs autonomously, everything else (`live-runtime`, `human-experience`, `mixed`) pauses auto-mode and waits for the user. But the agent already has full Playwright capabilities — it can navigate pages, fill forms, assert UI state, take screenshots, and check network responses.

**Recommendation:** Add a `browser-verified` UAT type between `artifact-driven` and `live-runtime`. The agent exercises the running app via browser tools, asserts expected states, captures screenshots as evidence, and only pauses for truly subjective checks ("does this feel right"). This eliminates the majority of UAT pauses for web projects.

**Implementation:** The `pauseAfterDispatch` logic in `auto-dispatch.ts:122` already keys on UAT type — adding a new type that doesn't pause is structurally trivial.

---

## 3. Post-Execution Smoke Test Runner

Agents can run tests during execution, but there is no structural guarantee that they do. The execute-task prompt says "verify must-haves" but it's guidance, not enforcement.

**Recommendation:** A lightweight post-unit hook (infrastructure exists in `post-unit-hooks.ts`) that runs after every `execute-task` unit. It executes the project's test suite (or a subset tagged for the current slice), and if tests fail, automatically re-dispatches the task with failure context. No human intervention needed — the agent broke a test, the agent fixes it.

**Implementation:** CI-in-the-loop pattern running locally before commit rather than after push.

---

## 4. Git Push + PR Creation as Agent Capability

Agents can commit within worktrees but cannot push or create PRs. For solo-dev workflows this is pure friction — the agent finishes a milestone, the user manually pushes and creates a PR.

**Recommendation:** A `complete-milestone` enhancement or post-milestone hook that:
- Pushes the milestone branch to remote
- Creates a draft PR with the milestone summary as the body
- Optionally runs `gh pr checks` and reports status

**Guard rails:** Only on milestone completion (not per-task), draft PRs only, preference toggle to opt in/out.

---

## 5. Deployment Verification Loop

Railway MCP tools are available (`railway_get_deployments`, `railway_get_logs`, `railway_redeploy_service`). The GSD dispatch table has no concept of "deploy and verify."

**Recommendation:** A `deploy-and-verify` unit type (or post-milestone hook) that:
1. Triggers deployment via Railway/Vercel/configured MCP
2. Polls for deployment completion
3. Runs smoke tests against the deployed URL (browser tools or curl)
4. Reports pass/fail

This closes the loop from "code works locally" to "code works in production" without human involvement.

---

## 6. Runtime Error Monitoring During Execution

When agents run `npm run dev` or start a server for browser testing, they don't systematically capture stderr/console errors. A server might throw warnings or errors the agent doesn't notice because it's focused on the happy path in the browser.

**Recommendation:** Instruct the execute-task prompt to capture and review server logs after browser verification. The `browser_console` tool already exists — pair it with checking the server process output for unhandled errors, deprecation warnings, and crashes.

---

## 7. Dependency Security Scan

After adding new packages (which execution agents do regularly), there is no `npm audit` or equivalent check. Another zero-subjectivity gate.

**Recommendation:** Post-execution check: if `package.json` changed, run `npm audit --audit-level=moderate` and flag critical/high vulnerabilities before completing the task.

---

## Priority Ranking

| # | Gap | Effort | Impact | Autonomy Gain |
|---|-----|--------|--------|---------------|
| 1 | Self-lint/typecheck gate | Low | High | Catches 80% of mechanical errors |
| 2 | Browser-verified UAT type | Medium | High | Eliminates most UAT pauses |
| 3 | Post-execution test runner hook | Low | High | Prevents broken-test commits |
| 4 | Git push + draft PR | Low | Medium | Removes manual git ceremony |
| 5 | Deploy verification loop | Medium | Medium | Closes local→prod gap |
| 6 | Runtime error capture | Low | Medium | Catches silent failures |
| 7 | Dependency security scan | Low | Low | Safety net for new deps |

---

## What's Already Strong

- Browser tools integration — full Playwright coverage
- Artifact-driven UAT pattern for non-UI work
- Memory extraction + knowledge accumulation (agents get smarter over time)
- Worktree isolation model for parallel work
- Blocker discovery → automatic replan loop (self-healing)

---

## Meta-Observation

The biggest theme across all gaps: **the agent has the tools but lacks structural loops that force it to use them before progressing**. The execute-task prompt *suggests* verification, but the dispatch table doesn't *enforce* it. Adding post-unit verification hooks that gate progression (similar to how missing task-plan files already block execution at `auto-dispatch.ts:258`) is the single highest-leverage architectural change.
