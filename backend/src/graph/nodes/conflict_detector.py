from pathlib import Path
import json
from openai import AsyncOpenAI
from src.state import KeystoneState, ConflictResult

# sentence-transformers is optional — removed to keep Docker image under 2GB.
# When available, uses embedding similarity to pre-filter project pairs before LLM.
# When unavailable, falls back to LLM-only conflict detection on all pairs.
_embedding_model = None
_embeddings_available = None  # None = not yet checked


def get_embedding_model():
    global _embedding_model, _embeddings_available
    if _embeddings_available is False:
        return None
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np  # noqa: F401
        from sklearn.metrics.pairwise import cosine_similarity  # noqa: F401
        if _embedding_model is None:
            _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        _embeddings_available = True
        return _embedding_model
    except ImportError:
        _embeddings_available = False
        return None


async def conflict_detector_node(state: KeystoneState) -> dict:
    """
    Detects conflicts between all non-spark, non-shipped projects.
    Uses sentence-transformers for embedding similarity.
    """
    try:
        all_projects = state.get('all_project_states', [])
        if len(all_projects) < 2:
            return {'detected_conflicts': []}

        import os
        threshold = float(os.environ.get('CONFLICT_THRESHOLD', '0.75'))

        # Filter to active projects only
        active = [p for p in all_projects if p.get('stage') not in ('spark', 'shipped', 'retrospective')]
        if len(active) < 2:
            return {'detected_conflicts': []}

        # Try embedding-based pre-filtering; fall back to LLM-only if unavailable
        model = get_embedding_model()
        conflicts = []

        if model is not None:
            # Embedding path: only call LLM on high-similarity pairs
            import numpy as np
            from sklearn.metrics.pairwise import cosine_similarity
            texts = [f"{p.get('title', '')} {p.get('description', '')} {' '.join(p.get('stack', []))}" for p in active]
            embeddings = model.encode(texts)
            for i in range(len(active)):
                for j in range(i + 1, len(active)):
                    sim = float(cosine_similarity([embeddings[i]], [embeddings[j]])[0][0])
                    if sim >= threshold:
                        conflict = await _classify_conflict(active[i], active[j])
                        if conflict:
                            conflicts.append(conflict)
        else:
            # LLM-only fallback: check all pairs directly (slower but no heavy deps)
            for i in range(len(active)):
                for j in range(i + 1, len(active)):
                    conflict = await _classify_conflict(active[i], active[j])
                    if conflict:
                        conflicts.append(conflict)

        return {'detected_conflicts': conflicts}
    except Exception as e:
        return {'errors': [*state.get('errors', []), f'conflict_detector failed: {str(e)}']}


async def _classify_conflict(project_a: dict, project_b: dict) -> ConflictResult | None:
    """Call LLM to determine if similarity = real conflict."""
    try:
        prompt_path = Path(__file__).parent.parent / 'prompts' / 'conflict_detector.md'
        system_prompt = prompt_path.read_text()

        client = AsyncOpenAI()
        user_content = f"""Project A: {json.dumps(project_a)}
Project B: {json.dumps(project_b)}"""

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)

        if not result.get('conflict_exists', True):
            return None

        return {
            'id': str(__import__('uuid').uuid4()),
            'type': result.get('type', 'scope_collision'),
            'severity': result.get('severity', 'advisory'),
            'project_a_id': project_a.get('id', ''),
            'project_b_id': project_b.get('id', ''),
            'specific_conflict': result.get('specific_conflict', ''),
            'resolution_options': result.get('resolution_options', []),
        }
    except Exception:
        return None


async def conflict_persister_node(state: KeystoneState) -> dict:
    """Saves detected conflicts to database."""
    # Phase 5: conflicts are already detected; persistence happens via
    # background/conflict_scanner.py which calls this graph. Return as-is.
    return {}


async def conflict_notifier_node(state: KeystoneState) -> dict:
    """Sends SSE + push notifications for new conflicts."""
    try:
        from src.routers.stream import broadcast_to_team
        for conflict in state.get('detected_conflicts', []):
            await broadcast_to_team(state.get('team_id', ''), {
                'type': 'conflict.detected',
                'data': {
                    'conflict_id': conflict['id'],
                    'type': conflict['type'],
                    'severity': conflict['severity'],
                    'project_a_id': conflict['project_a_id'],
                    'project_b_id': conflict['project_b_id'],
                    'specific_conflict': conflict['specific_conflict'],
                }
            })
    except Exception:
        pass
    return {}
