import json
from pathlib import Path

from openai import AsyncOpenAI

from src.state import KeystoneState


async def _draft_section(state: KeystoneState, section_name: str, schema: dict) -> dict:
    """Draft a single PRD section. Returns the section content."""
    try:
        if state.get('loop_count', 0) >= 3:
            return {'status': 'failed', 'errors': [*state.get('errors', []), 'Max loops']}

        prompt_path = Path(__file__).parent.parent / 'prompts' / 'prd_drafter.md'
        system_prompt = prompt_path.read_text()

        brief = state.get('brief', {})
        user_content = f"""
section_name: {section_name}
brief: {json.dumps(brief)}
schema_hint: {json.dumps(schema)}
spark_input: {state.get('raw_input', '')}
"""
        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o",  # TODO: update to gpt-5.4
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {}


async def draft_problem_statement_node(state: KeystoneState) -> dict:
    result = await _draft_section(state, 'problem_statement', {'type': 'string'})
    existing = state.get('prd_draft') or {}
    return {'prd_draft': {**existing, 'problem_statement': result.get('problem_statement', '')}}


async def draft_user_stories_node(state: KeystoneState) -> dict:
    result = await _draft_section(
        state,
        'user_stories',
        {'type': 'array', 'items': {'as': 'str', 'i_want': 'str', 'so_that': 'str'}}
    )
    existing = state.get('prd_draft') or {}
    return {'prd_draft': {**existing, 'user_stories': result.get('user_stories', [])}}


async def draft_requirements_node(state: KeystoneState) -> dict:
    result = await _draft_section(
        state,
        'requirements',
        {'functional': 'array', 'non_functional': 'array'}
    )
    existing = state.get('prd_draft') or {}
    return {'prd_draft': {**existing,
        'functional_requirements': result.get('functional_requirements', []),
        'non_functional_requirements': result.get('non_functional_requirements', []),
        'out_of_scope': result.get('out_of_scope', [])
    }}


async def draft_stack_node(state: KeystoneState) -> dict:
    result = await _draft_section(
        state,
        'stack',
        {'stack': 'array[str]', 'data_layer_spec': 'object'}
    )
    existing = state.get('prd_draft') or {}
    return {'prd_draft': {**existing,
        'stack': result.get('stack', []),
        'data_layer_spec': result.get('data_layer_spec', {}),
        'api_contracts': result.get('api_contracts', [])
    }}


async def draft_components_node(state: KeystoneState) -> dict:
    result = await _draft_section(
        state,
        'components',
        {'component_inventory': 'array', 'success_criteria': 'array[str]'}
    )
    existing = state.get('prd_draft') or {}
    return {'prd_draft': {**existing,
        'component_inventory': result.get('component_inventory', []),
        'success_criteria': result.get('success_criteria', [])
    }}


async def section_merger_node(state: KeystoneState) -> dict:
    """Merge all drafted sections into a clean PRDContent dict."""
    draft = state.get('prd_draft') or {}
    merged = {
        'problem_statement': draft.get('problem_statement', ''),
        'user_stories': draft.get('user_stories', []),
        'functional_requirements': draft.get('functional_requirements', []),
        'non_functional_requirements': draft.get('non_functional_requirements', []),
        'out_of_scope': draft.get('out_of_scope', []),
        'stack': draft.get('stack', []),
        'component_inventory': draft.get('component_inventory', []),
        'data_layer_spec': draft.get('data_layer_spec', {}),
        'api_contracts': draft.get('api_contracts', []),
        'success_criteria': draft.get('success_criteria', []),
        'open_questions': state.get('hypotheses') and [] or [],
        'claude_code_prompt': '',
    }
    return {'prd_draft': merged}


def spawn_parallel_sections(state: KeystoneState):
    """Routes to all 5 section drafters simultaneously via Send API."""
    from langgraph.types import Send
    return [
        Send("section_stories", state),
        Send("section_requirements", state),
        Send("section_stack", state),
        Send("section_components", state),
    ]
    # section_problem runs first and passes result to all others via state
