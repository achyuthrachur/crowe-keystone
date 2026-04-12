import { useKeystoneStore } from '@/stores/keystone.store';
import type { RemovedSegment, AcronymEntry, ContentOutline } from '@/types/keystone.types';

export function useRunGraphState() {
  const activeRun = useKeystoneStore((s) => s.activeRun);
  const gs = activeRun?.graph_state ?? {};

  return {
    // Gate 1
    filteredTranscript: (gs.filtered_transcript ?? '') as string,
    removedSegments: (gs.removed_segments ?? []) as RemovedSegment[],

    // Gate 2
    acronymGlossary: (gs.acronym_glossary ?? []) as AcronymEntry[],
    clientContextProfile: (gs.client_context_profile ?? {}) as Record<string, unknown>,

    // Gate 3
    contentOutline: (gs.content_outline ?? null) as ContentOutline | null,

    // Meta
    currentNode: (gs.current_node ?? '') as string,
    errors: (gs.errors ?? []) as string[],
  };
}
