'use client';

import React, { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { ProjectNode } from './nodes/ProjectNode';
import { ConflictNode } from './nodes/ConflictNode';
import { DecisionNode } from './nodes/DecisionNode';
import { StageEdge } from './edges/StageEdge';
import { ConflictEdge } from './edges/ConflictEdge';
import { layoutWithDagre } from '@/lib/graph-layout';
import { STAGE_COLORS } from '@/lib/stage-colors';
import { useGraphStore } from '@/stores/graph.store';
import type { GraphData, KeystoneNodeData } from '@/types/graph.types';
import type { Stage } from '@/lib/stage-colors';

// ─── Node / edge type registrations ─────────────────────────────────────────
const nodeTypes: NodeTypes = {
  project:  ProjectNode,
  conflict: ConflictNode,
  decision: DecisionNode,
};

const edgeTypes: EdgeTypes = {
  stage:    StageEdge,
  conflict: ConflictEdge,
};

// ─── SWR fetcher ─────────────────────────────────────────────────────────────
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`Graph fetch failed: ${r.status}`);
    return r.json() as Promise<GraphData>;
  });

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

// ─── Project detail drawer ───────────────────────────────────────────────────
interface DrawerProps {
  nodeData: KeystoneNodeData | null;
  onClose: () => void;
}

function ProjectDetailDrawer({ nodeData, onClose }: DrawerProps) {
  const colors = nodeData ? STAGE_COLORS[nodeData.stage] ?? STAGE_COLORS.spark : null;
  const assignedTo = nodeData?.assigned_to as string | null | undefined;
  const effortEstimate = nodeData?.effort_estimate;
  const updatedAt = nodeData?.updated_at as string | undefined;

  return (
    <AnimatePresence>
      {nodeData && colors && (
        <motion.aside
          key="project-drawer"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            right: 0,
            top: '3.5rem',         // below topbar (h-14)
            width: 320,
            height: 'calc(100vh - 3.5rem)',
            background: 'var(--surface-elevated)',
            borderLeft: '1px solid var(--border-subtle)',
            boxShadow: '-4px 0 16px rgba(1,30,65,0.06)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Stage badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: colors.bg,
                  color: colors.text,
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: 'var(--font-geist-sans)',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 9 }}>{colors.icon}</span>
                {nodeData.stage.replace('_', ' ')}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-geist-sans)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {nodeData.title}
              </h2>
            </div>

            <button
              onClick={onClose}
              aria-label="Close drawer"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: '16px',
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Owner */}
            {assignedTo && (
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-geist-sans)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 4,
                  }}
                >
                  Owner
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {assignedTo}
                </span>
              </div>
            )}

            {/* Effort */}
            {effortEstimate != null && (
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-geist-sans)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 4,
                  }}
                >
                  Effort
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {nodeData.effort_estimate != null ? String(nodeData.effort_estimate) : ''}
                </span>
              </div>
            )}

            {/* Conflict indicator */}
            {nodeData.has_conflicts && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--coral-glow)',
                  border: '1px solid var(--border-coral)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--coral)',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                <span>⚠</span>
                <span>Has open conflicts</span>
              </div>
            )}

            {/* Updated at */}
            {updatedAt && (
              <div>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  Updated {new Date(updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <Link
              href={`/projects/${nodeData.id}`}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '8px',
                background: 'var(--amber-core)',
                color: 'var(--surface-base)',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--font-geist-sans)',
                textDecoration: 'none',
              }}
            >
              View full project →
            </Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Main graph component ────────────────────────────────────────────────────
export default function KeystoneGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<KeystoneNodeData | null>(null);

  const storeNodes = useGraphStore((s) => s.nodes);
  const storeEdges = useGraphStore((s) => s.edges);
  const setStoreNodes = useGraphStore((s) => s.setNodes);
  const setStoreEdges = useGraphStore((s) => s.setEdges);

  // SWR fetch
  const { data, error } = useSWR<GraphData>(
    `${BACKEND_URL}/api/v1/graph`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Seed store from SWR if store is empty
  useEffect(() => {
    if (data && storeNodes.length === 0) {
      setStoreNodes(data.nodes);
      setStoreEdges(data.edges);
    }
  }, [data, storeNodes.length, setStoreNodes, setStoreEdges]);

  // Apply dagre layout whenever store nodes/edges change
  useEffect(() => {
    if (storeNodes.length === 0) return;
    const { nodes: laid, edges: laidEdges } = layoutWithDagre(storeNodes, storeEdges);
    setNodes(laid);
    setEdges(laidEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as KeystoneNodeData);
  }, []);

  const nodeColor = useCallback((n: Node): string => {
    const stage = (n.data as KeystoneNodeData)?.stage as Stage | undefined;
    if (!stage) return '#666';
    const raw = STAGE_COLORS[stage]?.text ?? '#666';
    // CSS vars can't be used directly in MiniMap — map to approximate hex
    const colorMap: Record<Stage, string> = {
      spark:         '#F5A800',
      brief:         '#D7761D',
      draft_prd:     '#0075C9',
      review:        '#B14FC5',
      approved:      '#05AB8C',
      in_build:      '#0075C9',
      shipped:       '#05AB8C',
      retrospective: '#F5A800',
    };
    return colorMap[stage] ?? '#666';
  }, []);

  if (error) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-base)',
          color: 'var(--text-tertiary)',
          fontSize: 14,
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        Failed to load graph. Please refresh.
      </div>
    );
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          style: { strokeWidth: 1.5, stroke: 'var(--border-default)' },
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--surface-base)', height: '100%' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <Controls
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(10,15,26,0.7)"
          style={{
            background: 'var(--surface-elevated)',
            borderRadius: 8,
          }}
        />
      </ReactFlow>

      <ProjectDetailDrawer
        nodeData={selectedNodeData}
        onClose={() => setSelectedNodeData(null)}
      />
    </div>
  );
}
