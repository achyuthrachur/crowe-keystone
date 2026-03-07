'use client';

// Phase 1 stub — full implementation in Phase 6
import { useAgentStore } from '@/stores/agent.store';
import type { AgentRun } from '@/types/agent.types';

export function useAgentStream(projectId: string): AgentRun | undefined {
  const { activeRunForProject } = useAgentStore();
  return activeRunForProject(projectId);
}
