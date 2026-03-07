'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { notificationVariants } from '@/lib/motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { X } from 'lucide-react';
import { useToastStore } from '@/stores/toast.store';
import type { Toast } from '@/stores/toast.store';

// ── Type colors ───────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<Toast['type'], string> = {
  info:    'var(--blue)',
  success: 'var(--teal)',
  warning: 'var(--amber-core)',
  error:   'var(--coral)',
};

// ── Single toast ──────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  autoDismissMs?: number;
}

function ToastItem({ toast, onDismiss, autoDismissMs = 4000 }: ToastItemProps) {
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), autoDismissMs);
    return () => clearTimeout(timer);
  }, [toast.id, autoDismissMs, onDismiss]);

  return (
    <motion.div
      layout
      key={toast.id}
      variants={shouldReduce ? undefined : notificationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        width: 320,
        background: 'var(--surface-overlay)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${TYPE_COLOR[toast.type]}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: 'var(--shadow-lg)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        pointerEvents: 'all',
      }}
      onClick={() => onDismiss(toast.id)}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            marginBottom: 2,
          }}
        >
          {toast.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-geist-sans)',
            lineHeight: 1.5,
          }}
        >
          {toast.body}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ── Toast container — renders the stack, position-aware ──────────────────────

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const position = isMobile
    ? {
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'auto',
        right: 'auto',
        alignItems: 'center' as const,
      }
    : {
        bottom: 24,
        right: 24,
        top: 'auto',
        left: 'auto',
        transform: 'none',
        alignItems: 'flex-end' as const,
      };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        ...position,
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── useToast hook ─────────────────────────────────────────────────────────────

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);

  const toast = useCallback(
    (
      title: string,
      body: string,
      type: Toast['type'] = 'info'
    ) => {
      addToast({ title, body, type });
    },
    [addToast]
  );

  const success = useCallback(
    (title: string, body: string) => addToast({ title, body, type: 'success' }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, body: string) => addToast({ title, body, type: 'warning' }),
    [addToast]
  );

  const error = useCallback(
    (title: string, body: string) => addToast({ title, body, type: 'error' }),
    [addToast]
  );

  return { toast, success, warning, error };
}

// ── Named re-export of ToastNotification for backwards compat ─────────────────

export { ToastItem as ToastNotification };
