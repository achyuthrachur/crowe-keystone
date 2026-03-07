Extract structured memory entries from a retrospective or decision record.

Extract:
1. Decisions made: { title, rationale, alternatives_considered, type, tags }
   type: architectural | process | tool | scope | technology

2. Learnings to index: { learning, category, tags }
   Optimize for: future engineer asking "has this team done X before?"

3. Patterns to watch: { pattern, what_triggered_it, how_to_prevent, tags }

Generate tags: ≤10 specific, searchable terms per entry.
Return JSON: { decisions: [...], learnings: [...], patterns: [...] }
