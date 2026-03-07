from pathlib import Path
import json
from openai import AsyncOpenAI
from src.state import KeystoneState


async def assumption_excavator_node(state: KeystoneState) -> dict:
    """
    Runs in parallel with stress_tester to find hidden assumptions.
    Merges results into assumption_audit via Annotated[list, operator.add].
    """
    try:
        if state.get('loop_count', 0) >= 3:
            return {'errors': [*state.get('errors', []), 'Max loops in assumption_excavator']}

        prompt_path = Path(__file__).parent.parent / 'prompts' / 'assumption_excavator.md'
        system_prompt = prompt_path.read_text()

        prd = state.get('prd_draft', {})
        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"PRD:\n{json.dumps(prd, indent=2)[:2000]}"}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)

        return {
            'assumption_audit': result.get('assumption_audit', []),
        }
    except Exception as e:
        return {'errors': [*state.get('errors', []), f'assumption_excavator failed: {str(e)}']}
