import type { Node, Edge } from '@xyflow/react';
import type { Stage } from '@/lib/stage-colors';

export interface KeystoneNodeData {
  id: string;
  title: string;
  stage: Stage;
  assigned_to: string | null;
  has_conflicts: boolean;
  is_agent_active: boolean;
  updated_at: string;
  [key: string]: unknown;
}

export type KeystoneNode = Node<KeystoneNodeData>;

export interface KeystoneEdgeData {
  label?: string;
  conflict_id?: string;
  [key: string]: unknown;
}

export type KeystoneEdge = Edge<KeystoneEdgeData>;

export interface GraphData {
  nodes: KeystoneNode[];
  edges: KeystoneEdge[];
}
