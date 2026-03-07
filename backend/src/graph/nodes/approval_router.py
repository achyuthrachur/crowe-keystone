from pathlib import Path
import json
from openai import AsyncOpenAI
from src.state import KeystoneState


async def approval_router_node(state: KeystoneState) -> dict:
    """Generates AI approval request summary ≤120 words."""
    try:
        if state.get('loop_count', 0) >= 3:
            return {'errors': [*state.get('errors', []), 'Max loops']}

        prompt_path = Path(__file__).parent.parent / 'prompts' / 'approval_router.md'
        system_prompt = prompt_path.read_text()

        context = {
            'approval_type': state.get('approval_type', 'stage_advance'),
            'project_context': state.get('context', {}),
            'prd_summary': str(state.get('prd_draft', {}))[:1000],
        }

        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(context)}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)

        return {
            'approval_context_summary': result.get('summary', ''),
            'approval_chain': result.get('approval_chain', []),
            'loop_count': state.get('loop_count', 0) + 1,
        }
    except Exception as e:
        return {'errors': [*state.get('errors', []), f'approval_router failed: {str(e)}']}
