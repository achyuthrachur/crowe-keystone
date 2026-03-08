'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { STAGE_COLORS, STAGE_ORDER, STAGE_LABELS } from '@/lib/stage-colors';
import { accordionVariants, tapVariants } from '@/lib/motion';
import type { GraphData, KeystoneNodeData } from '@/types/graph.types';
import type { Stage } from '@/lib/stage-colors';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => r.json() as Promise<GraphData>);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MobileGraphList() {
  const { data, error } = useSWR<GraphData>(
    `${BACKEND_URL}/api/v1/graph`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const [openStages, setOpenStages] = useState<Set<Stage>>(new Set(['spark']));

  const toggleStage = (stage: Stage) => {
    setOpenStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) { next.delete(stage); } else { next.add(stage); }
      return next;
    });
  };

  // Group nodes by stage
  const grouped: Record<Stage, KeystoneNodeData[]> = STAGE_ORDER.reduce(
    (acc, stage) => ({ ...acc, [stage]: [] }),
    {} as Record<Stage, KeystoneNodeData[]>
  );

  if (data) {
    for (const node of data.nodes) {
      const nd = node.data as KeystoneNodeData;
      if (nd.stage && grouped[nd.stage]) {
        grouped[nd.stage].push(nd);
      }
    }
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 14,
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        Failed to load graph data.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
        background: 'var(--surface-base)',
        paddingBottom: 80, // clearance for bottom nav
      }}
    >
      {/* Stage accordion groups */}
      {STAGE_ORDER.map((stage) => {
        const colors = STAGE_COLORS[stage];
        const items = grouped[stage];
        const isOpen = openStages.has(stage);
        const label = STAGE_LABELS[stage];

        return (
          <div key={stage} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {/* Accordion header */}
            <motion.button
              variants={tapVariants}
              whileTap="tap"
              onClick={() => toggleStage(stage)}
              aria-expanded={isOpen}
              aria-label={`${label} — ${items.length} projects`}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--surface-base)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 44,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Stage icon */}
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: colors.text,
                    flexShrink: 0,
                  }}
                >
                  {colors.icon}
                </span>

                {/* Stage name */}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {label}
                </span>

                {/* Count badge */}
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: 9999,
                    background: 'var(--surface-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-geist-sans)',
                    fontWeight: 500,
                  }}
                >
                  {items.length}
                </span>
              </div>

              {/* Chevron */}
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                  transition: 'transform 200ms',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▾
              </span>
            </motion.button>

            {/* Accordion content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  variants={accordionVariants}
                  style={{ overflow: 'hidden' }}
                >
                  {items.length === 0 ? (
                    <div
                      style={{
                        padding: '12px 16px 12px 54px',
                        fontSize: 13,
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-geist-sans)',
                      }}
                    >
                      No projects
                    </div>
                  ) : (
                    items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/projects/${item.id}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <motion.div
                          variants={tapVariants}
                          whileTap="tap"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '0 16px 0 54px',
                            height: 60,
                            background: 'var(--surface-primary)',
                            borderTop: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                          }}
                        >
                          {/* Stage dot */}
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: colors.text,
                              flexShrink: 0,
                            }}
                          />

                          {/* Title */}
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              fontFamily: 'var(--font-geist-sans)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </span>

                          {/* Time ago */}
                          {item.updated_at && (
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--text-tertiary)',
                                fontFamily: 'var(--font-geist-sans)',
                                flexShrink: 0,
                              }}
                            >
                              {timeAgo(item.updated_at)}
                            </span>
                          )}

                          {/* Conflict dot */}
                          {item.has_conflicts && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--coral)',
                                flexShrink: 0,
                              }}
                              title="Has conflicts"
                            />
                          )}
                        </motion.div>
                      </Link>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Footer link */}
      <div
        style={{
          padding: '20px 16px',
          textAlign: 'center',
        }}
      >
        <Link
          href="/graph"
          style={{
            fontSize: 13,
            color: 'var(--amber-core)',
            fontFamily: 'var(--font-geist-sans)',
            textDecoration: 'none',
          }}
        >
          View full graph ↗
        </Link>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
            margin: '4px 0 0',
          }}
        >
          Landscape orientation recommended
        </p>
      </div>
    </div>
  );
}
