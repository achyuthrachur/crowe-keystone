'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cardVariants } from '@/lib/motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface SparkInputProps {
  onClose: () => void;
  onSubmit?: (title: string, content: string) => void;
}

export function SparkInput({ onClose, onSubmit }: SparkInputProps) {
  const [content, setContent] = useState('');
  const isMobile = useMediaQuery('(max-width: 639px)');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!content.trim()) return;
    const firstLine = content.split('\n')[0].trim();
    const title = firstLine.slice(0, 80) || 'New Spark';
    onSubmit?.(title, content);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,15,26,0.7)',
          backdropFilter: 'blur(12px)',
          zIndex: 100,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : 20,
        }}
      >
        <motion.div
          key="modal"
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--surface-overlay)',
            borderRadius: isMobile ? '20px 20px 0 0' : 16,
            padding: 24,
            width: isMobile ? '100%' : 480,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: 16,
              margin: '0 0 16px',
            }}
          >
            What do you want to build?
          </h2>

          <textarea
            ref={textareaRef}
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the problem or idea in plain language..."
            style={{
              width: '100%',
              minHeight: 120,
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              ⌘ Enter to submit
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-geist-sans)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim()}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: content.trim() ? 'var(--amber-core)' : 'var(--surface-input)',
                  color: content.trim() ? 'var(--text-inverse)' : 'var(--text-tertiary)',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'var(--font-geist-sans)',
                  cursor: content.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease-out',
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
