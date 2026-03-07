# Agentic Coding Workflows — Beyond GSD
## Reference Document for Crowe Keystone Build Team

This document describes the agentic coding workflow landscape as of March 2026.
Understand all of them. Choose the right one for each phase of Keystone.

---

## 1. GSD (Get Shit Done) — Your Current Framework

**Philosophy:** Lifecycle management from idea to deployment. Execution-first.
**Cycle:** Discuss → Plan → Execute → Verify
**Strengths:** Full lifecycle, milestone-based phase delivery, git branch integration,
out-of-band tools (/gsd:add-todo, /gsd:quick, /gsd:debug), native Claude Code integration.
**When to use:** Default workflow for all Keystone phases. Best for solo or paired work
where you want the tool to manage the entire lifecycle.

---

## 2. Spec-Driven Development (SDD) — The Meta-Framework

**Philosophy:** Specifications are the source of truth. Code is a generated artifact.
**Artifacts:** requirements.md, design.md, tasks.md — living documents, not throwaway scaffolding.
**Core principle from McKinsey (2026):** "Agents are good at generating content within a
bounded problem; they struggle with meta-level decisions about workflow sequencing."
Therefore: deterministic orchestration for workflow control, bounded agent execution,
automated evaluation at each step.

**The Two-Layer Model:**
- Orchestration Layer: deterministic, rule-based, controls phase transitions
- Execution Layer: bounded AI agents, one job each, clear inputs and outputs

**Phase transition rules (enforce these in Keystone):**
1. Requirements must be complete before tasks are generated
2. Architecture must be reviewed before implementation starts
3. Each artifact has a state machine: draft → in-review → approved → complete
4. Agents cannot advance the workflow — only humans at defined checkpoints

**Use for Keystone:** Every PRD in Keystone IS an SDD spec. The stage graph (Spark →
Brief → Draft PRD → Review → Approved → In Build → Shipped) IS the deterministic
orchestration layer. The LangGraph agents are the bounded execution layer.

---

## 3. GitHub Spec Kit — Feature-Level SDD

**Philosophy:** Spec-to-code at the feature level. Individual developer focused.
**Workflow:** Write a spec → agent generates code → human reviews diff
**When to use:** Building individual Keystone features where you have a clear spec and
want to generate implementation from it. Best for the frontend components in Phase 3.
**Integration:** Your specs live in the Keystone /docs folder. Point Spec Kit at them.

---

## 4. BMad Method — Full Team SDD

**Philosophy:** Full project lifecycle for an entire agile team (PMs, architects, devs).
**Agents:** Analyst, Architect, Developer, QA — each with defined handoffs.
**When to use:** As Keystone's team grows. BMad maps directly onto Keystone's own
approval chain model — it's the development workflow that Keystone is designed to support.
**Key pattern:** BMad's QA Agent verifies implementation against original user stories
and acceptance criteria. Implement this as Keystone's retrospective verification step.

---

## 5. Taskmaster AI — Task Graph Execution

**Philosophy:** Breaks a complex project into a dependency graph of atomic tasks.
Each task has clear acceptance criteria. Agent executes task by task with dependency resolution.
**When to use:** Phase 5 (LangGraph backend) and Phase 6 (LangGraph agents) — where
the build has many interdependent pieces that need careful sequencing.
**Key insight:** Taskmaster prevents agents from starting task N before task N-1 is
verified. This is critical for LangGraph work where state schema must be finalized
before any node implementation begins.
**Setup:** tasks.md with frontmatter state machine per task.

---

## 6. Claude Code Native SDD (Agent Factory Pattern)

**Philosophy:** CLAUDE.md is the project constitution. Subagents handle parallel research.
Native Tasks system handles implementation with dependency ordering.

**Core mechanics:**
- CLAUDE.md: project conventions, architecture notes, test commands, directory layout
- .claude/agents/*.md: persistent specialist agents, shareable across team
- Task tool: three execution modes — parallel, sequential, background
- Plan subagent (v2.0.28): dedicated planning with subagent resumption
- Explore subagent (v2.0.17): Haiku-powered codebase search (cheap, fast)

**Agent definition pattern (.claude/agents/agent-name.md):**
```yaml
---
name: keystone-schema-validator
description: Validates LangGraph state TypedDicts and Pydantic models. Use when
  adding new state fields, modifying existing schema, or reviewing node return types.
model: claude-sonnet-4-5  # or haiku for cheaper tasks
tools:
  - read
  - grep
---

You validate schema definitions in the Keystone codebase.
[full instructions...]
```

**Domain parallel pattern for CLAUDE.md:**
```markdown
## Domain Parallel Patterns
When implementing cross-domain features, spawn parallel agents:
- Frontend agent: React components, UI state, animations (src/app, src/components)
- Backend agent: FastAPI routes, LangGraph nodes (backend/src)
- Schema agent: TypedDict state, Pydantic models (backend/src/state.py)
- Test agent: Vitest tests, pytest tests
Each agent owns their domain completely.
```

---

## 7. Experimental Agent Teams — Claude Code

**Status:** Experimental, disabled by default. Enable with:
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

**Architecture:**
- One session acts as team lead — coordinates, assigns, synthesizes
- Teammates work independently, each in own context window
- Teammates can communicate DIRECTLY with each other (unlike subagents)
- You can interact with individual teammates without going through the lead

**When to use for Keystone:** Phase 5 and 6 (LangGraph backend + agents). The backend
has four separable domains — state schema, node implementations, FastAPI server,
agent system prompts — that can be built in parallel by four teammates.

**Best use cases:**
- Cross-layer coordination: frontend + backend + tests owned by different teammates
- Parallel hypothesis exploration: multiple approaches to a hard problem
- Challenge and validate: teammates reviewing each other's implementations

**Known limitations:** Session resumption issues, task coordination overhead,
shutdown behavior. Use only when parallelism value outweighs coordination cost.

---

## 8. Multiclaude — Team-Mode Multi-Agent Orchestration

**What it is:** Open-source orchestrator. Supervisor agent assigns tasks to subagents.
Define subagents via Markdown files.
**Two modes:** Singleplayer (auto-merge PRs) or Multiplayer (teammates review code).
**When to use:** When Keystone team is 3+ people and you want automated PR review
pipeline.
**Installation:** `go install github.com/dlorenc/multiclaude/cmd/multiclaude@latest`

---

## 9. 12-Factor Agents — Production Reliability Pattern

**Philosophy:** Build reliable LLM applications using 12 principles analogous to
the 12-factor app methodology.
**Key factors relevant to Keystone:**
1. Stateless agents with external state stores (LangGraph checkpointer = Postgres)
2. Treat prompts as configuration — version control them
3. Structured outputs everywhere — never parse freeform LLM text
4. Human-in-the-loop at defined checkpoints, not ad-hoc
5. Confidence gates before expensive operations
6. Observable agents — trace every node, every tool call, every token

**Apply to Keystone:** Every LangGraph node returns structured Pydantic output.
Every node execution is traced with OpenTelemetry. Confidence scores propagate
through the graph mathematically, not qualitatively.

---

## The Keystone Build Workflow Stack

**Recommended combination for each phase:**

| Phase | Primary Workflow | Supporting Workflows |
|-------|-----------------|---------------------|
| Phase 1 (Foundation) | GSD | SDD (CLAUDE.md as spec) |
| Phase 2 (Auth + Data) | GSD + Taskmaster AI | SDD spec per feature |
| Phase 3 (UI) | GSD + Spec Kit | Domain parallel agents |
| Phase 4 (React Flow) | GSD | Domain parallel agents |
| Phase 5 (LangGraph) | GSD + Taskmaster AI | 12-Factor Agents, Agent Teams |
| Phase 6 (AI Agents) | BMad Method | SDD per agent, 12-Factor |
| Phase 7 (Integrations) | GSD | Spec Kit per integration |
| Phase 8 (Polish) | GSD | Spec Kit per component |

**The meta-rule:** GSD manages the lifecycle. SDD provides the specs.
Taskmaster manages dependencies within a phase. Agent Teams parallelize
domain-separated work. 12-Factor ensures production reliability.

---

## Custom Agents to Define in .claude/agents/

These agents should be defined in the Keystone repo and shared across the team:

1. **keystone-schema-validator.md** — validates state TypedDicts and Pydantic models
2. **keystone-graph-reviewer.md** — reviews LangGraph node implementations for correctness
3. **keystone-frontend-specialist.md** — React Flow + Framer Motion + Crowe brand
4. **keystone-test-writer.md** — writes Vitest (frontend) and pytest (backend) tests
5. **keystone-security-auditor.md** — reviews API routes, auth middleware, exposed keys
6. **keystone-prompt-engineer.md** — reviews and improves LangGraph agent system prompts
7. **keystone-migration-writer.md** — writes Prisma migrations, validates schema changes
8. **keystone-sse-specialist.md** — Server-Sent Events implementation and debugging
