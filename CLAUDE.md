# CLAUDE.md — Crowe-Keystone
> Project-level overrides only. Global standards live in the parent CLAUDE.md and .claude/skills/.

## PROJECT
- **Repo:** https://github.com/achyuthrachur/Crowe-Keystone
- **Stack:** Next.js 15, TypeScript, Tailwind, shadcn/ui, Vercel (frontend) + Python/FastAPI/LangGraph, Railway (backend)
- **Brand:** Crowe dark-first — load `.claude/skills/branding/SKILL.md` for UI work

## KICKOFF PROMPT
```
1. Check if HANDOFF.md exists in the project root — if yes, read it first.
2. Read PRD.md in full.
3. Load .claude/skills/architecture/SKILL.md and .claude/skills/frontend/SKILL.md.

Work on ONE phase at a time. When the phase is complete OR when /compact
triggers, write HANDOFF.md summarising what was done and what comes next,
then stop. Do not continue into the next phase without a fresh session.

Do NOT spawn subagents. Do NOT rewrite entire files — make targeted edits.
Ask before making architecture decisions not covered in the PRD.
Run npm run build and npm run typecheck after every phase.
```

## AGENT RULES
- Do NOT run autonomously — always confirm before proceeding between phases
- Do NOT spawn subagents unless explicitly instructed
- Ask before making architecture decisions
- Write HANDOFF.md before ending any session

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
