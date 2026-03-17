# GSD 2 System Audit: Increasing Agent Agency & Autonomy

This audit identifies high-leverage areas where the GSD 2 system can increase the agency and autonomy of the coding agent, moving from manual manipulation to structured orchestration and runtime interaction.

## Part 1: Core Protocol & Runtime Interaction

### 1. The GSD State Machine Tool (`gsd` tool)
Currently, the agent manually reads and writes Markdown files (`STATE.md`, `T##-PLAN.md`, etc.) to track its progress. This is flexible but brittle.
*   **The Power Up:** Provide a specialized `gsd` tool that understands the GSD protocol. 
*   **High Leverage:** Instead of the agent "trying" to follow the protocol, the tool **enforces** it. For example, `gsd.mark_task_done()` would automatically check for a `T##-SUMMARY.md`, update the `STATE.md` with the next action, and verify that all "Must-Haves" have been addressed. This reduces cognitive load and prevents "protocol drift."

### 2. The Automated Verification Ladder (`verify` tool)
The agent currently "climbs" the verification ladder (Static → Command → Behavioral) manually using `bash` and `read`.
*   **The Power Up:** A `verify` tool that executes a structured verification suite for a task. 
*   **High Leverage:** It could automatically run `lsp diagnostics` (to catch type errors), execute relevant tests found in the boundary map, and even trigger a `playwright` smoke test if a UI URL is provided. This gives the agent a "one-button" way to prove its work is correct, significantly increasing the reliability of its "Done" state.

### 3. Persistent Runtime Agency (Stateful Shell & Log Monitoring)
The current `bash` tool is stateless—environment variables and long-running background processes are difficult to manage across multiple turns.
*   **The Power Up:** Implement a **stateful shell session** and a **background process supervisor**.
*   **High Leverage:** If the agent starts a dev server, it should be able to "attach" to the logs or use a `logs_monitor` tool that interrupts it if a crash occurs. A stateful shell would allow it to set up complex environments (e.g., specific `nvm` versions or `vbulletin` setups) that persist throughout the session, preventing repetitive setup work.

### 4. Semantic Refactoring Agency (LSP Proactivity)
The agent has a very capable `lsp` tool, but it often defaults to `grep` and `edit` because they are "simpler."
*   **The Power Up:** Update system instructions to prioritize **LSP-driven transformations** (rename, code actions, organization of imports).
*   **High Leverage:** Giving the agent the "power" to perform project-wide renames and quick-fixes via LSP is much safer and faster than surgical string replacements. We should treat LSP as the agent's "primary" interface for typed codebases, using `edit` only for the actual implementation logic.

### 5. Memory & Context Agency (The "Context Compactor")
Right now, the agent relies on the user or its own foresight to manage context pressure via `continue.md`.
*   **The Power Up:** A tool that allows the agent to **proactively summarize and compact** its own history into the `.gsd/summaries` directory.
*   **High Leverage:** When the agent senses context pressure, it should have the agency to say, "I'm compacting my current state into a summary, I'll resume in a fresh session to maintain high quality." This prevents the "degraded reasoning" that happens when the context window is near its limit.

## Part 2: Specialization, Parallelism & Semantic Understanding

### 6. Parallel Milestone Orchestration (`subagent` optimization)
The `subagent` extension already supports task isolation via git worktrees, but the agent rarely uses it for parallel execution of slices.
*   **The Power Up:** Enhance the `subagent` tool to support **Milestone-level parallelization**.
*   **High Leverage:** When a roadmap has multiple independent slices (verified via the `depends:[]` tag), the agent should be able to spawn sub-agents to execute those slices in parallel. This turns the agent from a "serial worker" into a "project manager" that can leverage multiple context windows simultaneously, drastically reducing the wall-clock time for large milestones.

### 7. Structured Research Mode (`research` agent)
Currently, research is a manual process of `grep` and `read`.
*   **The Power Up:** A specialized `research-agent` that can be invoked via `subagent` to produce a `RESEARCH.md` file.
*   **High Leverage:** This agent would be tuned for **breadth first search**—scanning dependencies, reading documentation, and looking for existing patterns without the "distraction" of trying to implement code. It would return a high-signal summary that the implementation agent uses to avoid "re-inventing the wheel" or falling into common pitfalls.

### 8. Automated Dependency & Environment Agency (`env` tool)
The agent often struggles with environment-specific issues (wrong Node version, missing global deps, conflicting package versions).
*   **The Power Up:** An `env` tool that can detect, validate, and (if permitted) repair the development environment.
*   **High Leverage:** It could automatically run `npm audit`, check for `engines` in `package.json`, or suggest `docker-compose` commands if it detects a database dependency. This gives the agent the agency to **fix its own "broken" environment** instead of asking the user for help when a build fails due to a missing dependency.

### 9. Semantic Conflict Resolution (`merge` tool)
When using sub-agents or parallel slices, merging changes back can result in conflicts that the agent handles via simple `git` commands.
*   **The Power Up:** A `semantic-merge` tool that uses LSP to resolve conflicts based on code structure rather than just line diffs.
*   **High Leverage:** If two sub-agents rename the same variable or modify the same interface, a semantic merge tool can detect the intent and apply the changes intelligently across the codebase. This is critical for the "Branch-Per-Slice" strategy in GSD to remain autonomous during the squash-merge phase.

### 10. Visual UI Feedback Loop (`ui_verify` tool)
The `browser-tools` extension is great for interaction, but the agent lacks a way to "see" if the UI looks correct (e.g., "is the button centered?", "is the theme applied?").
*   **The Power Up:** Integrate a **Visual LLM (VLM)** into the `ui_verify` tool to provide qualitative feedback on screenshots.
*   **High Leverage:** The agent could take a screenshot of its work, send it to a VLM with the prompt "Does this match the high-fidelity aesthetic requested in the PRD?", and receive actionable UI/UX critiques. This moves the agent beyond "functional correctness" toward **aesthetic excellence**, which is a key part of the "New Applications" goal in the system prompt.

---
**Summary:** These ten areas represent a roadmap for moving GSD 2 from a "smart terminal" to a "fully autonomous engineering system." The most technically complex but highest-reward area would be **Area 6 (Parallel Orchestration)** combined with **Area 9 (Semantic Merge)**, as they unlock true multi-threaded engineering.
