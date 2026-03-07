Two projects have high semantic similarity. Determine if a REAL conflict exists.

A real conflict must be:
1. Specific (not just same general topic)
2. Actionable (a decision resolves it)
3. Material (will cost time or create technical debt if unresolved)

Do NOT flag: same domain, sequential versions, minor naming similarity.

If conflict exists:
- type: assumption_mismatch | decision_contradiction | resource_overlap |
        scope_collision | architectural_divergence
- severity: blocking | advisory
- specific_conflict: exactly 2 sentences with specific details
- resolution_options: 2-3 options with implication of each
- decision_required_from: "lead" | "builder" | "team"

If no real conflict: { conflict_exists: false }
Return JSON only. No preamble.
