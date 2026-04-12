'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useRunGraphState } from '@/hooks/useRunGraphState';
import type { Engagement, ContentOutline, OutlineItem } from '@/types/keystone.types';

// ── Section definitions ───────────────────────────────────────────────────────

const OUTLINE_SECTIONS = [
  { key: 'key_themes',               label: 'Key Themes',               color: 'var(--amber-core)' },
  { key: 'pain_points',              label: 'Pain Points',               color: 'var(--coral)' },
  { key: 'stated_priorities',        label: 'Stated Priorities',         color: 'var(--blue)' },
  { key: 'open_questions',           label: 'Open Questions',            color: 'var(--violet)' },
  { key: 'potential_recommendations', label: 'Potential Recommendations', color: 'var(--teal)' },
  { key: 'suggested_next_steps',     label: 'Suggested Next Steps',      color: 'var(--amber-dark)' },
] as const;

type SectionKey = typeof OUTLINE_SECTIONS[number]['key'];

// ── Spinner ───────────────────────────────────────────────────────────────────

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

// ── Sortable item row ─────────────────────────────────────────────────────────

interface SortableItemRowProps {
  item: OutlineItem;
  sectionKey: SectionKey;
  onUpdate: (sectionKey: SectionKey, id: string, field: keyof OutlineItem, value: string) => void;
  onDelete: (sectionKey: SectionKey, id: string) => void;
}

function SortableItemRow({ item, sectionKey, onUpdate, onDelete }: SortableItemRowProps) {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex', gap: 8, alignItems: 'flex-start',
          padding: '8px 10px', borderRadius: 6,
          background: 'var(--surface-overlay)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 6,
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: 'var(--text-tertiary)', flexShrink: 0, paddingTop: 2 }}
        >
          <GripVertical size={14} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <textarea
              value={item.text}
              onChange={(e) => onUpdate(sectionKey, item.id, 'text', e.target.value)}
              onBlur={() => setEditing(false)}
              autoFocus
              rows={2}
              style={{
                width: '100%', background: 'var(--surface-input)',
                border: '1px solid var(--border-amber)', borderRadius: 6,
                padding: '6px 10px', fontSize: 13, color: 'var(--text-primary)',
                fontFamily: 'var(--font-geist-sans)', lineHeight: 1.5,
                resize: 'none', outline: 'none', minHeight: 40, boxSizing: 'border-box',
              }}
            />
          ) : (
            <p
              onClick={() => setEditing(true)}
              style={{
                flex: 1, fontSize: 13, color: item.text ? 'var(--text-primary)' : 'var(--text-tertiary)',
                lineHeight: 1.6, cursor: 'text', margin: 0,
                fontStyle: item.text ? 'normal' : 'italic',
              }}
            >
              {item.text || 'Click to edit…'}
            </p>
          )}

          {item.source_quote && (
            <p style={{
              fontSize: 11, color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-geist-mono)',
              fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.5,
              paddingLeft: 10, borderLeft: '2px solid var(--border-subtle)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              &ldquo;{item.source_quote}&rdquo;
            </p>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(sectionKey, item.id)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: 4, borderRadius: 4, flexShrink: 0,
            transition: 'color 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--coral)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <Trash2 size={13} />
        </button>
      </motion.div>
    </div>
  );
}

// ── Accordion section ─────────────────────────────────────────────────────────

interface AccordionSectionProps {
  sectionKey: SectionKey;
  label: string;
  color: string;
  items: OutlineItem[];
  onUpdate: (sectionKey: SectionKey, id: string, field: keyof OutlineItem, value: string) => void;
  onDelete: (sectionKey: SectionKey, id: string) => void;
  onAdd: (sectionKey: SectionKey) => void;
  onReorder: (sectionKey: SectionKey, activeId: string, overId: string) => void;
}

function AccordionSection({ sectionKey, label, color, items, onUpdate, onDelete, onAdd, onReorder }: AccordionSectionProps) {
  const [open, setOpen] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(sectionKey, String(active.id), String(over.id));
    }
  }

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 0,
          padding: '10px 14px', background: 'var(--surface-elevated)',
          border: 'none', cursor: 'pointer', borderLeft: `3px solid ${color}`,
          transition: 'background 150ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-elevated)'; }}
      >
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>
          {label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
          background: `${color}18`, color,
          marginRight: 8,
        }}>
          {items.length}
        </span>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'var(--text-tertiary)', display: 'flex' }}
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.15 } }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 12px 12px' }}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence>
                    {items.map((item) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        sectionKey={sectionKey}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>

              {/* Add item */}
              <button
                onClick={() => onAdd(sectionKey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--text-tertiary)', background: 'transparent',
                  border: '1px dashed var(--border-default)', borderRadius: 6,
                  padding: '6px 12px', cursor: 'pointer', width: '100%',
                  marginTop: 4, transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; e.currentTarget.style.color = 'var(--amber-core)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                <Plus size={12} />
                Add item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Gate3Panel ────────────────────────────────────────────────────────────────

interface Gate3PanelProps {
  engagement: Engagement;
  token: string;
}

const emptyOutline = (): ContentOutline => ({
  key_themes: [], pain_points: [], stated_priorities: [],
  open_questions: [], potential_recommendations: [], suggested_next_steps: [],
});

export function Gate3Panel({ engagement, token }: Gate3PanelProps) {
  const { submitGate3 } = useKeystoneStore();
  const { contentOutline } = useRunGraphState();
  const [outline, setOutline] = useState<ContentOutline>(() => contentOutline ?? emptyOutline());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(sectionKey: SectionKey, id: string, field: keyof OutlineItem, value: string) {
    setOutline((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function deleteItem(sectionKey: SectionKey, id: string) {
    setOutline((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((item) => item.id !== id),
    }));
  }

  function addItem(sectionKey: SectionKey) {
    setOutline((prev) => ({
      ...prev,
      [sectionKey]: [
        ...prev[sectionKey],
        { id: crypto.randomUUID(), text: '', source_quote: '', slide_type_hint: null },
      ],
    }));
  }

  function reorderItems(sectionKey: SectionKey, activeId: string, overId: string) {
    setOutline((prev) => {
      const items = prev[sectionKey];
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, [sectionKey]: arrayMove(items, oldIndex, newIndex) };
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await submitGate3(engagement.id, outline, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  const totalItems = OUTLINE_SECTIONS.reduce((acc, s) => acc + outline[s.key].length, 0);
  const nonEmptySections = OUTLINE_SECTIONS.filter((s) => outline[s.key].length > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Gate 3 — Content Outline Review
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          Review and edit the structured outline. Drag rows to reorder, click text to edit inline,
          or add and remove items as needed.
        </p>
      </div>

      {/* Accordion sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {OUTLINE_SECTIONS.map((section) => (
          <AccordionSection
            key={section.key}
            sectionKey={section.key}
            label={section.label}
            color={section.color}
            items={outline[section.key]}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onAdd={addItem}
            onReorder={reorderItems}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 12, color: 'var(--coral)', margin: '12px 0 0' }}
        >
          {error}
        </motion.p>
      )}

      {/* Sticky submit */}
      <div style={{
        position: 'sticky', bottom: 0, paddingTop: 16,
        background: 'linear-gradient(to bottom, transparent, var(--surface-base) 40%)',
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {totalItems} item{totalItems !== 1 ? 's' : ''} across {nonEmptySections} section{nonEmptySections !== 1 ? 's' : ''}
        </span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            height: 44, padding: '0 28px', borderRadius: 8, border: 'none',
            background: 'var(--amber-core)', color: 'var(--text-inverse)',
            fontSize: 14, fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {submitting && <Spinner />}
          Finalize Outline
        </motion.button>
      </div>
    </motion.div>
  );
}
