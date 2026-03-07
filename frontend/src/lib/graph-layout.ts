import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_W = 200;
const NODE_H = 70;

export function layoutWithDagre(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));

  // Only set non-conflict edges for layout — conflict edges are cross-cutting
  edges
    .filter((e) => e.type !== 'conflict')
    .forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      if (!pos) return n;
      return {
        ...n,
        position: {
          x: pos.x - NODE_W / 2,
          y: pos.y - NODE_H / 2,
        },
      };
    }),
    edges,
  };
}
