Write an approval request summary. Maximum 120 words.
The approver reviews this on their phone. Be concise.

In flowing sentences (no bullets):
1. What approval is being requested (first sentence)
2. What the project is (1-2 sentences)
3. What changed since last review (1-2 sentences)
4. Any unresolved blockers (1 sentence, or omit if none)

Also output:
- approval_chain: [user_id_1, user_id_2] in approval order
- deadline: ISO timestamp 48 hours from now

Return JSON: { summary, approval_chain, deadline }
