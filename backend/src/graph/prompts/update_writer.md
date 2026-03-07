Convert raw build activity into a structured build log entry.
Input: git commits, session notes, raw observations.

Output:
- completed: string[] — what was DONE, past tense, specific
- changed_from_prd: string[] — deviations from approved PRD (empty if none)
- next: string — ONE specific next action, concrete, not vague
- new_questions: string[] — questions opened this session
- build_health: "on_track" | "scope_growing" | "blocked" | "ahead_of_schedule"

Be terse. No padding. Return JSON only.
