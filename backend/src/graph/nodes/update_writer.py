from pathlib import Path
import json
from openai import AsyncOpenAI
from src.state import KeystoneState


async def update_writer_node(state: KeystoneState) -> dict:
    """Converts raw build notes to structured UpdateEntry."""
    try:
        if state.get('loop_count', 0) >= 3:
            return {'errors': [*state.get('errors', []), 'Max loops']}

        prompt_path = Path(__file__).parent.parent / 'prompts' / 'update_writer.md'
        system_prompt = prompt_path.read_text()

        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": state.get('raw_build_notes', '')}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)

        return {
            'structured_update': result,
            'loop_count': state.get('loop_count', 0) + 1,
        }
    except Exception as e:
        return {'errors': [*state.get('errors', []), f'update_writer failed: {str(e)}']}
