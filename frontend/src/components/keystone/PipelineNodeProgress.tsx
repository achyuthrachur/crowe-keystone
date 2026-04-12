'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const NODE_ORDER = [
  'transcript_ingester',
  'noise_filter',
  'research_agent',
  'disambiguator',
  'content_extractor',
  'brief_compiler',
];

const NODE_LABELS: Record<string, string> = {
  transcript_ingester: 'Transcript Ingester',
  noise_filter:        'Noise Filter',
  research_agent:      'Research Agent',
  disambiguator:       'Disambiguator',
  content_extractor:   'Content Extractor',
  brief_compiler:      'Brief Compiler',
};

interface PipelineNodeProgressProps {
  currentNode: string | null;
}

export function PipelineNodeProgress({ currentNode }: PipelineNodeProgressProps) {
  const currentIndex = currentNode ? NODE_ORDER.indexOf(currentNode) : -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {NODE_ORDER.map((node, index) => {
        const isComplete = currentIndex > index;
        const isActive = currentIndex === index;
        const isPending = currentIndex < index;

        return (
          <motion.div
            key={node}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, duration: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 6,
              background: isActive ? 'var(--surface-input)' : 'transparent',
            }}
          >
            {/* Node state indicator */}
            <div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
              {isActive && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid var(--amber-core)',
                    borderTopColor: 'transparent',
                    position: 'absolute',
                    top: -2, left: -2,
                  }}
                />
              )}
              {isComplete ? (
                <CheckCircle2 size={16} color="var(--teal)" />
              ) : (
                <div
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: `1.5px solid ${isActive ? 'var(--amber-core)' : 'var(--border-default)'}`,
                    background: isActive ? 'var(--amber-glow)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isActive && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber-core)' }} />
                  )}
                </div>
              )}
            </div>

            {/* Node label */}
            <span
              style={{
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isComplete
                  ? 'var(--teal)'
                  : isActive
                  ? 'var(--amber-core)'
                  : 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-mono)',
              }}
            >
              {index + 1}. {NODE_LABELS[node]}
            </span>

            {isComplete && (
              <span style={{ fontSize: 10, color: 'var(--teal)', marginLeft: 'auto', opacity: 0.7 }}>done</span>
            )}
            {isActive && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ fontSize: 10, color: 'var(--amber-core)', marginLeft: 'auto' }}
              >
                running
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
