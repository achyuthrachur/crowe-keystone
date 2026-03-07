from pathlib import Path
import json
from openai import AsyncOpenAI
from src.state import KeystoneState, HypothesisResult, AssumptionAudit


async def stress_tester_spawner_node(state: KeystoneState) -> dict:
    """
    Calls the stress test LLM and spawns hypothesis test branches.
    Returns initial hypotheses for parallel testing.
    """
    try:
        if state.get('loop_count', 0) >= 3:
            return {'status': 'failed', 'errors': [*state.get('errors', []), 'Max loops']}

        prompt_path = Path(__file__).parent.parent / 'prompts' / 'stress_tester.md'
        system_prompt = prompt_path.read_text()

        prd = state.get('prd_draft', {})
        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"PRD to stress test:\n{json.dumps(prd, indent=2)[:3000]}"}
            ],
            temperature=0.4,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        hypotheses = result.get('hypotheses', [])
        assumption_audit = result.get('assumption_audit', [])

        return {
            'hypotheses': hypotheses,
            'assumption_audit': assumption_audit,
            'loop_count': state.get('loop_count', 0) + 1,
        }
    except Exception as e:
        return {'errors': [*state.get('errors', []), f'stress_tester failed: {str(e)}']}


async def test_hypothesis_node(state: KeystoneState) -> dict:
    """
    Tests a single hypothesis from state['hypotheses'].
    In Phase 5, just returns the hypothesis as-is (no additional LLM call).
    Phase 6 can add adversarial testing per hypothesis.
    """
    # Just pass through — hypotheses are already evaluated by stress_tester_spawner
    return {}


async def red_team_node(state: KeystoneState) -> dict:
    """
    Red team: tries to kill the top hypothesis.
    Checks if supporting evidence outweighs contradicting evidence.
    """
    hypotheses = state.get('hypotheses', [])
    if not hypotheses:
        return {}

    # Mark the highest-confidence hypothesis as potentially killed
    updated = []
    for h in hypotheses:
        killed = (
            isinstance(h.get('contradicting_evidence'), list) and
            len(h.get('contradicting_evidence', [])) > len(h.get('supporting_evidence', []))
        )
        updated.append({**h, 'killed_by_red_team': killed})

    # Compute overall stress test confidence
    scores = [h.get('confidence_score', 0.5) for h in hypotheses]
    avg_confidence = sum(scores) / len(scores) if scores else 0.5
    # Lower stress test confidence = more concerns found
    stress_test_confidence = 1.0 - avg_confidence

    return {
        'hypotheses': updated,
        'stress_test_confidence': stress_test_confidence,
        'adversarial_findings': [h.get('statement', '') for h in hypotheses if not h.get('killed_by_red_team', False)],
    }
