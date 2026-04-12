'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import type { Engagement, UploadedDocument } from '@/types/keystone.types';

interface RunConfirmModalProps {
  open: boolean;
  onClose: () => void;
  engagement: Engagement;
  documents: UploadedDocument[];
  token: string;
}

export function RunConfirmModal({ open, onClose, engagement, documents, token }: RunConfirmModalProps) {
  const { startRun } = useKeystoneStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcript = documents.find((d) => d.doc_type === 'transcript');

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      await startRun(engagement.id, token);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start pipeline');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'fixed', inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 50,
                }}
              />
            </Dialog.Overlay>

            {/* Content */}
            <Dialog.Content asChild>
              <div
                style={{
                  position: 'fixed', inset: 0, zIndex: 51,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 16,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    width: '100%', maxWidth: 480,
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 12,
                    padding: 24,
                    display: 'flex', flexDirection: 'column', gap: 20,
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Dialog.Title style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      Start Pipeline?
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        background: 'transparent', cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Body */}
                  <Dialog.Description style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    This will process the transcript through 6 nodes. You&apos;ll be asked to review at
                    Gates 1, 2, and 3 before the final brief is generated.
                  </Dialog.Description>

                  {/* Summary */}
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: 'var(--surface-overlay)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <Row label="Client" value={engagement.client_name} />
                    <Row label="Date" value={new Date(engagement.engagement_date).toLocaleDateString()} />
                    <Row label="Transcript" value={transcript?.original_filename ?? '—'} />
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: 12, color: 'var(--coral)', margin: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      onClick={onClose}
                      disabled={loading}
                      style={{
                        height: 40, padding: '0 18px', borderRadius: 8,
                        border: '1px solid var(--border-default)',
                        background: 'transparent', cursor: loading ? 'not-allowed' : 'pointer',
                        color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={loading ? {} : { scale: 1.02 }}
                      whileTap={loading ? {} : { scale: 0.97 }}
                      onClick={handleStart}
                      disabled={loading}
                      style={{
                        height: 40, padding: '0 20px', borderRadius: 8, border: 'none',
                        background: loading ? 'var(--surface-input)' : 'linear-gradient(135deg, var(--amber-core), var(--amber-dark))',
                        color: loading ? 'var(--text-tertiary)' : 'var(--text-inverse)',
                        fontSize: 14, fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        boxShadow: loading ? 'none' : 'var(--shadow-amber)',
                      }}
                    >
                      {loading ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{
                              display: 'inline-block', width: 14, height: 14,
                              borderRadius: '50%',
                              border: '2px solid var(--text-tertiary)',
                              borderTopColor: 'transparent',
                            }}
                          />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          Start Pipeline
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
      <span style={{ color: 'var(--text-tertiary)', width: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  );
}
