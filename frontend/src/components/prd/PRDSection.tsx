'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { tapVariants } from '@/lib/motion';

interface PRDSectionProps {
  section: string;
  label: string;
  value: unknown;
  onSave: (value: unknown) => Promise<void> | void;
}

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((v) => typeof v === 'string');
}

function isObjectArray(val: unknown): val is Record<string, unknown>[] {
  return Array.isArray(val) && val.every((v) => typeof v === 'object' && v !== null);
}

function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') return val.trim() === '';
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val as object).length === 0;
  return false;
}

function ContentView({ value }: { value: unknown }) {
  if (isEmpty(value)) {
    return (
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-geist-sans)',
          margin: 0,
          fontStyle: 'italic',
        }}
      >
        Not defined yet
      </p>
    );
  }

  if (typeof value === 'string') {
    return (
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
          margin: 0,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {value}
      </p>
    );
  }

  if (isStringArray(value)) {
    return (
      <ul
        style={{
          margin: 0,
          padding: '0 0 0 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {value.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-geist-sans)',
              lineHeight: 1.5,
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (isObjectArray(value)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {value.map((item, i) => (
          <div
            key={i}
            style={{
              padding: '8px 10px',
              background: 'var(--surface-input)',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {Object.entries(item).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-geist-sans)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                    minWidth: 80,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {typeof v === 'string' ? v : JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Fallback: render as formatted JSON
  return (
    <pre
      style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-geist-mono)',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EditTextarea({
  initialValue,
  isComplex,
  onChange,
}: {
  initialValue: unknown;
  isComplex: boolean;
  onChange: (val: unknown) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [raw, setRaw] = useState<string>(
    isComplex ? JSON.stringify(initialValue, null, 2) : String(initialValue ?? '')
  );
  const [error, setError] = useState<string | null>(null);

  // Auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [raw]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setRaw(next);
    setError(null);

    if (isComplex) {
      try {
        const parsed = JSON.parse(next) as unknown;
        onChange(parsed);
      } catch {
        setError('Invalid JSON');
      }
    } else {
      onChange(next);
    }
  }

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={raw}
        onChange={handleChange}
        style={{
          width: '100%',
          minHeight: 80,
          padding: '8px 10px',
          background: 'var(--surface-input)',
          border: `1px solid ${error ? 'var(--coral)' : 'var(--border-default)'}`,
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 13,
          fontFamily: isComplex ? 'var(--font-geist-mono)' : 'var(--font-geist-sans)',
          lineHeight: 1.6,
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--amber-core)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--coral)' : 'var(--border-default)';
        }}
      />
      {error && (
        <p
          style={{
            fontSize: 11,
            color: 'var(--coral)',
            fontFamily: 'var(--font-geist-sans)',
            margin: '4px 0 0',
          }}
        >
          {error}
        </p>
      )}
      {isComplex && (
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-geist-sans)',
            margin: '4px 0 0',
          }}
        >
          Edit as JSON array or object
        </p>
      )}
    </div>
  );
}

export function PRDSection({ section: _section, label, value, onSave }: PRDSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState<unknown>(value);
  const [isSaving, setIsSaving] = useState(false);
  const shouldReduce = useReducedMotion();

  const isComplex = Array.isArray(value) || (typeof value === 'object' && value !== null);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(pendingValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setPendingValue(value);
    setIsEditing(false);
  }

  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: isEditing ? '1px solid var(--border-subtle)' : undefined,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>

        {!isEditing && (
          <button
            onClick={() => {
              setPendingValue(value);
              setIsEditing(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-input)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-geist-sans)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--amber-core)';
              e.currentTarget.style.color = 'var(--amber-core)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <span style={{ fontSize: 11 }}>&#9998;</span>
            Edit
          </button>
        )}
      </div>

      {/* Content area */}
      <div style={{ padding: '12px 16px' }}>
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit"
              initial={shouldReduce ? undefined : { opacity: 0 }}
              animate={shouldReduce ? undefined : { opacity: 1 }}
              exit={shouldReduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EditTextarea
                initialValue={value}
                isComplex={isComplex}
                onChange={(val) => setPendingValue(val)}
              />

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 10,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={handleCancel}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    fontFamily: 'var(--font-geist-sans)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  Cancel
                </button>

                <motion.button
                  whileTap={shouldReduce ? undefined : tapVariants.tap}
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: isSaving ? 'var(--surface-input)' : 'var(--amber-core)',
                    color: isSaving ? 'var(--text-tertiary)' : 'var(--surface-base)',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-geist-sans)',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="view"
              initial={shouldReduce ? undefined : { opacity: 0 }}
              animate={shouldReduce ? undefined : { opacity: 1 }}
              exit={shouldReduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ContentView value={value} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
