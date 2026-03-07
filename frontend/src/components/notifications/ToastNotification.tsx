'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationVariants } from '@/lib/motion';
import { X } from 'lucide-react';

interface ToastNotificationProps {
  id: string;
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onDismiss: (id: string) => void;
  autoDismissMs?: number;
}

export function ToastNotification({
  id,
  title,
  body,
  type = 'info',
  onDismiss,
  autoDismissMs = 4000,
}: ToastNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), autoDismissMs);
    return () => clearTimeout(timer);
  }, [id, autoDismissMs, onDismiss]);

  const colors = {
    info: 'var(--blue)',
    success: 'var(--teal)',
    warning: 'var(--amber-core)',
    error: 'var(--coral)',
  };

  return (
    <motion.div
      key={id}
      variants={notificationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        width: 320,
        background: 'var(--surface-overlay)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${colors[type]}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: 'var(--shadow-lg)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
      onClick={() => onDismiss(id)}
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
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-geist-sans)',
            lineHeight: 1.5,
          }}
        >
          {body}
        </div>
      </div>
      <button
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
