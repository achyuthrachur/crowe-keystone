'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useRunGraphState } from '@/hooks/useRunGraphState';
import type { Engagement, AcronymEntry } from '@/types/keystone.types';

interface Gate2PanelProps {
  engagement: Engagement;
  token: string;
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{
        display: 'inline-block', width: 14, height: 14,
        borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)',
        borderTopColor: 'transparent',
      }}
    />
  );
}

export function Gate2Panel({ engagement, token }: Gate2PanelProps) {
  const { submitGate2 } = useKeystoneStore();
  const { acronymGlossary } = useRunGraphState();
  const [rows, setRows] = useState<AcronymEntry[]>(() =>
    acronymGlossary.map((e) => ({ ...e }))
  );
  const [editingCell, setEditingCell] = useState<{ row: number; field: 'term' | 'expansion' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, field: keyof AcronymEntry, value: string | number) {
    setRows((prev) => prev.map((r, i) =>
      i === index ? { ...r, [field]: value, source: 'user_edited' } : r
    ));
  }

  function deleteRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows((prev) => [...prev, { term: '', expansion: '', confidence: 1.0, source: 'user_edited' }]);
    setEditingCell({ row: rows.length, field: 'term' });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const valid = rows.filter((r) => r.term.trim() && r.expansion.trim());
      await submitGate2(engagement.id, valid, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  const GRID = '100px 1fr 90px 100px 40px';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Gate 2 — Glossary Review
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          Research complete. The table below shows acronyms detected for this client.
          Edit any expansion that looks wrong, then click Approve.
        </p>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: GRID,
          gap: 8, padding: '8px 12px',
          background: 'var(--surface-overlay)',
          borderBottom: '1px solid var(--border-default)',
        }}>
          {['Term', 'Expansion', 'Confidence', 'Source', ''].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Data rows */}
        <AnimatePresence initial={false}>
          {rows.map((row, index) => {
            const conf = row.confidence ?? 1;
            return (
              <motion.div
                key={`${index}-${row.term}`}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'grid', gridTemplateColumns: GRID,
                  gap: 8, padding: '8px 12px', alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: index % 2 === 0 ? 'var(--surface-elevated)' : 'var(--surface-overlay)',
                }}
              >
                {/* Term */}
                {editingCell?.row === index && editingCell.field === 'term' ? (
                  <input
                    value={row.term}
                    autoFocus
                    onChange={(e) => updateRow(index, 'term', e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    style={inputStyle}
                  />
                ) : (
                  <span
                    onClick={() => setEditingCell({ row: index, field: 'term' })}
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', cursor: 'text', fontFamily: 'var(--font-geist-mono)' }}
                  >
                    {row.term || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </span>
                )}

                {/* Expansion */}
                {editingCell?.row === index && editingCell.field === 'expansion' ? (
                  <input
                    value={row.expansion}
                    autoFocus
                    onChange={(e) => updateRow(index, 'expansion', e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    style={inputStyle}
                  />
                ) : (
                  <span
                    onClick={() => setEditingCell({ row: index, field: 'expansion' })}
                    style={{ fontSize: 12, color: 'var(--text-primary)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {row.expansion || <span style={{ color: 'var(--text-tertiary)' }}>click to edit</span>}
                  </span>
                )}

                {/* Confidence */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: conf >= 0.9 ? 'var(--teal)' : conf >= 0.7 ? 'var(--amber-core)' : 'var(--coral)', flexShrink: 0 }}>
                    {Math.round(conf * 100)}%
                  </span>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border-subtle)' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${conf * 100}%`, background: conf >= 0.9 ? 'var(--teal)' : 'var(--amber-core)' }} />
                  </div>
                </div>

                {/* Source */}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                  background: row.source === 'user_edited' ? 'var(--amber-glow)' : 'var(--surface-input)',
                  color: row.source === 'user_edited' ? 'var(--amber-core)' : 'var(--text-tertiary)',
                  border: `1px solid ${row.source === 'user_edited' ? 'var(--border-amber)' : 'var(--border-subtle)'}`,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {(row.source ?? 'web_search').replace(/_/g, ' ')}
                </span>

                {/* Delete */}
                <button
                  onClick={() => deleteRow(index)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', padding: 4, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'color 150ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add row */}
        <div style={{ padding: '8px 12px', background: 'var(--surface-overlay)' }}>
          <button
            onClick={addRow}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--text-tertiary)', background: 'transparent',
              border: '1px dashed var(--border-default)', borderRadius: 6,
              padding: '6px 12px', cursor: 'pointer', transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; e.currentTarget.style.color = 'var(--amber-core)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <Plus size={14} /> Add Acronym
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 12, color: 'var(--coral)', margin: 0 }}
        >
          {error}
        </motion.p>
      )}

      {/* Submit */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          alignSelf: 'flex-start',
          height: 44, padding: '0 28px', borderRadius: 8, border: 'none',
          background: 'var(--amber-core)', color: 'var(--text-inverse)',
          fontSize: 14, fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.7 : 1,
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {submitting && <Spinner />}
        Approve Glossary
      </motion.button>
    </motion.div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-input)',
  border: '1px solid var(--border-amber)',
  borderRadius: 4, padding: '3px 7px',
  fontSize: 12, color: 'var(--text-primary)',
  fontFamily: 'var(--font-geist-sans)',
  outline: 'none',
};
