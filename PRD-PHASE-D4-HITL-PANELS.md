# Keystone — PRD Phase D4: HITL Review Panels
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase D3 complete — stepper renders, upload works, run modal works

---

## Overview

Phase D4 builds the three human-in-the-loop review panels that expand inline
within the stepper content area. Each panel fetches its data from the run's
`graph_state` stored in the latest `KeystoneRun`, lets the user edit,
and submits to the corresponding gate endpoint.

Phase D4 deliverables:
1. `frontend/src/components/keystone/Gate1Panel.tsx` — noise filter review
2. `frontend/src/components/keystone/Gate2Panel.tsx` — glossary editor
3. `frontend/src/components/keystone/Gate3Panel.tsx` — content outline editor
4. `frontend/src/hooks/useRunGraphState.ts` — hook to extract gate data from run.graph_state

Exit criteria: all three review panels load gate data, allow editing, and
submit correctly to their respective API endpoints.

---

## 1. useRunGraphState hook

The `graph_state` JSONB field on `KeystoneRun` contains the full `KeystoneState`
snapshot. This hook extracts the relevant fields for each gate.

```typescript
// frontend/src/hooks/useRunGraphState.ts
import { useKeystoneStore } from '@/stores/keystone.store';
import type { RemovedSegment, AcronymEntry, ContentOutline } from '@/types/keystone.types';

export function useRunGraphState() {
  const activeRun = useKeystoneStore((s) => s.activeRun);
  const gs = (activeRun as any)?.graph_state ?? {};

  return {
    // Gate 1
    filteredTranscript: (gs.filtered_transcript ?? '') as string,
    removedSegments: (gs.removed_segments ?? []) as RemovedSegment[],

    // Gate 2
    acronymGlossary: (gs.acronym_glossary ?? []) as AcronymEntry[],
    clientContextProfile: gs.client_context_profile ?? {},

    // Gate 3
    contentOutline: (gs.content_outline ?? null) as ContentOutline | null,

    // Meta
    currentNode: (gs.current_node ?? '') as string,
    errors: (gs.errors ?? []) as string[],
  };
}
```

**Note:** `activeRun` is typed as `KeystoneRun` which doesn't include
`graph_state`. Cast to `any` for the graph_state access or extend the type
in `keystone.types.ts` to add `graph_state?: Record<string, unknown>`.

---

## 2. Gate 1 Panel — Gate1Panel.tsx

**Trigger:** `engagement.status === 'awaiting_review_1'`

**Layout:** full-width panel with two stacked sections:
- Top: the filtered transcript with removed segments highlighted inline
- Bottom: a list of removed segments with restore toggles

### 2.1 Panel entrance animation

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
>
```

### 2.2 Transcript with inline red highlights

Parse `filteredTranscript` and `removedSegments`. The segments were removed
from the filtered transcript — to reconstruct the inline view, show the
`filteredTranscript` as the base text, and render each `RemovedSegment.text`
inline at its approximate position with a red highlight and strikethrough.

Since exact character positions are not stored, take a simpler approach:
render the filtered transcript in a `<pre>`-style block, then render
a separate "Removed Segments" section below with the highlighted text.

Each removed segment is shown as a pill/block with:
- Red `var(--coral)` background `var(--coral-glow)`
- Red border `var(--border-coral)`
- Strikethrough on the segment text
- `reason` badge (off_topic / personal_chatter / other_workstream / admin)
- A "Restore" toggle button on the right

```tsx
// Removed segment row
<motion.div
  key={seg.id}
  layout
  initial={{ opacity: 0, x: -8 }}
  animate={{ opacity: 1, x: 0 }}
  style={{
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '10px 14px', borderRadius: 8,
    background: restored.has(seg.id) ? 'var(--teal-glow)' : 'var(--coral-glow)',
    border: `1px solid ${restored.has(seg.id) ? 'var(--border-teal)' : 'var(--border-coral)'}`,
    transition: 'all 200ms ease',
  }}
>
  {/* Segment text */}
  <div style={{ flex: 1 }}>
    <p style={{
      fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
      textDecoration: restored.has(seg.id) ? 'none' : 'line-through',
      textDecorationColor: 'var(--coral)',
      fontFamily: 'var(--font-mono)',
    }}>
      {seg.text}
    </p>
    {/* Reason badge */}
    <span style={{
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--coral)', marginTop: 4, display: 'block',
    }}>
      {seg.reason.replace(/_/g, ' ')}
    </span>
  </div>

  {/* Restore toggle */}
  <button
    onClick={() => toggleRestore(seg.id)}
    style={{
      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
      border: `1px solid ${restored.has(seg.id) ? 'var(--border-teal)' : 'var(--border-coral)'}`,
      background: 'transparent', cursor: 'pointer', flexShrink: 0,
      color: restored.has(seg.id) ? 'var(--teal)' : 'var(--coral)',
      transition: 'all 150ms ease',
    }}
  >
    {restored.has(seg.id) ? '✓ Restored' : 'Restore'}
  </button>
</motion.div>
```

### 2.3 Local state

```typescript
const [restored, setRestored] = useState<Set<string>>(new Set());
const toggleRestore = (id: string) => {
  setRestored((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};
```

### 2.4 Submit button

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  onClick={() => handleSubmit()}
  disabled={submitting}
  style={{
    height: 44, padding: '0 28px', borderRadius: 8, border: 'none',
    background: 'var(--amber-core)', color: 'var(--text-inverse)',
    fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
    opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8,
  }}
>
  {submitting ? <Spinner /> : null}
  {restored.size > 0 ? `Restore ${restored.size} segment${restored.size > 1 ? 's' : ''} & Continue` : 'Looks Good — Continue'}
</motion.button>
```

On submit: call `submitGate1(engagementId, Array.from(restored), token)`.
On success: store handles status update via SSE.
On error: show inline error in coral below the button.

---

## 3. Gate 2 Panel — Gate2Panel.tsx

**Trigger:** `engagement.status === 'awaiting_review_2'`

**Layout:** full-width editable table below a short intro paragraph.

### 3.1 Intro

```
Research complete. The table below shows acronyms detected for this client.
Edit any expansion that looks wrong, then click Approve.
```

### 3.2 Editable table

Columns: Term | Expansion | Confidence | Source | (delete)

```typescript
// Local state mirrors the glossary for editing
const [rows, setRows] = useState<AcronymEntry[]>(() =>
  acronymGlossary.map((e) => ({ ...e }))
);
```

**Table header** — uses the same dark navy style as the docx builder:
```tsx
// Header row
<div style={{
  display: 'grid',
  gridTemplateColumns: '100px 1fr 90px 100px 40px',
  gap: 8, padding: '8px 12px',
  background: 'var(--surface-overlay)',
  borderRadius: '8px 8px 0 0',
  borderBottom: '1px solid var(--border-default)',
}}>
  {['Term', 'Expansion', 'Confidence', 'Source', ''].map((h) => (
    <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {h}
    </span>
  ))}
</div>
```

**Data rows** — each cell is a controlled `<input>` when editing, plain text otherwise.
Click on Term or Expansion cells to enter edit mode:

```tsx
// Each cell in edit mode
<input
  value={row.expansion}
  onChange={(e) => updateRow(index, 'expansion', e.target.value)}
  style={{
    width: '100%', background: 'var(--surface-input)',
    border: '1px solid var(--border-amber)',
    borderRadius: 4, padding: '3px 7px',
    fontSize: 12, color: 'var(--text-primary)',
    fontFamily: 'var(--font-geist-sans)',
    outline: 'none',
  }}
  autoFocus
/>
```

**Confidence** — rendered as a colored number + small bar:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  <span style={{ fontSize: 12, color: confidence >= 0.9 ? 'var(--teal)' : confidence >= 0.7 ? 'var(--amber-core)' : 'var(--coral)' }}>
    {Math.round((row.confidence ?? 1) * 100)}%
  </span>
  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border-subtle)' }}>
    <div style={{ height: '100%', borderRadius: 2, width: `${(row.confidence ?? 1) * 100}%`, background: confidence >= 0.9 ? 'var(--teal)' : 'var(--amber-core)' }} />
  </div>
</div>
```

**Source badge:**
```tsx
<span style={{
  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
  background: row.source === 'user_edited' ? 'var(--amber-glow)' : 'var(--surface-input)',
  color: row.source === 'user_edited' ? 'var(--amber-core)' : 'var(--text-tertiary)',
  border: `1px solid ${row.source === 'user_edited' ? 'var(--border-amber)' : 'var(--border-subtle)'}`,
}}>
  {row.source?.replace(/_/g, ' ') ?? 'web search'}
</span>
```

When user edits a cell, mark `source = 'user_edited'` on that row.

**Delete row** — trash icon button. Animates the row out with:
```tsx
exit={{ opacity: 0, x: 20, height: 0 }}
transition={{ duration: 0.2 }}
```

**Add row** — button at the bottom of the table:
```tsx
<button onClick={addRow} style={{ /* ghost button style */ }}>
  <Plus size={14} /> Add Acronym
</button>
```
`addRow` appends `{ term: '', expansion: '', confidence: 1.0, source: 'user_edited' }`.

### 3.3 Submit

On submit: call `submitGate2(engagementId, rows.filter(r => r.term && r.expansion), token)`.

---

## 4. Gate 3 Panel — Gate3Panel.tsx

**Trigger:** `engagement.status === 'awaiting_review_3'`

**Layout:** 6 collapsible accordion sections, one per outline category.

### 4.1 Accordion sections

```typescript
const OUTLINE_SECTIONS = [
  { key: 'key_themes',              label: 'Key Themes',              color: 'var(--amber-core)' },
  { key: 'pain_points',             label: 'Pain Points',             color: 'var(--coral)' },
  { key: 'stated_priorities',       label: 'Stated Priorities',       color: 'var(--blue)' },
  { key: 'open_questions',          label: 'Open Questions',          color: 'var(--violet)' },
  { key: 'potential_recommendations', label: 'Potential Recommendations', color: 'var(--teal)' },
  { key: 'suggested_next_steps',    label: 'Suggested Next Steps',    color: 'var(--amber-dark)' },
] as const;
```

Each accordion section has:
- Header: colored left border (3px), section label, item count badge, chevron icon
- Body: list of `OutlineItem` rows, expand/collapse with `AnimatePresence`

**Accordion open/close animation:**
```tsx
<AnimatePresence initial={false}>
  {open && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ height: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.15 } }}
      style={{ overflow: 'hidden' }}
    >
      {/* items */}
    </motion.div>
  )}
</AnimatePresence>
```

Default state: all sections open on first render.

### 4.2 Outline item rows

Each row is draggable within its section using `@dnd-kit/sortable`
(already installed from D2).

```
┌─ item row ─────────────────────────────────────────────────────┐
│  ⠿ (drag handle)  [item text — click to edit inline]   🗑      │
│     Source: "verbatim quote from transcript"                    │
└────────────────────────────────────────────────────────────────┘
```

**Drag handle** — `GripVertical` lucide icon, visible on hover only:
```tsx
<motion.div
  initial={{ opacity: 0 }}
  whileHover={{ opacity: 1 }}  // on parent hover, not handle hover
  style={{ cursor: 'grab', color: 'var(--text-tertiary)', flexShrink: 0 }}
>
  <GripVertical size={14} />
</motion.div>
```

**Inline text editing** — click the item text to enter edit mode.
Renders a textarea that auto-expands:
```tsx
{editing ? (
  <textarea
    value={item.text}
    onChange={(e) => updateItem(sectionKey, item.id, 'text', e.target.value)}
    onBlur={() => setEditing(false)}
    autoFocus
    style={{
      flex: 1, background: 'var(--surface-input)',
      border: '1px solid var(--border-amber)', borderRadius: 6,
      padding: '6px 10px', fontSize: 13, color: 'var(--text-primary)',
      fontFamily: 'var(--font-geist-sans)', lineHeight: 1.5,
      resize: 'none', outline: 'none', minHeight: 40,
    }}
  />
) : (
  <p
    onClick={() => setEditing(true)}
    style={{
      flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6,
      cursor: 'text', margin: 0,
    }}
  >
    {item.text}
  </p>
)}
```

**Source quote** — shown in a muted monospace block below the text:
```tsx
<p style={{
  fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
  fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.5,
  paddingLeft: 10, borderLeft: '2px solid var(--border-subtle)',
}}>
  "{item.source_quote}"
</p>
```

**Delete button** — trash icon, appears on row hover:
```tsx
<motion.button
  initial={{ opacity: 0 }}
  whileHover={{ opacity: 1 }} // on parent hover
  onClick={() => deleteItem(sectionKey, item.id)}
  style={{
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'var(--coral)', padding: 4, borderRadius: 4, flexShrink: 0,
  }}
>
  <Trash2 size={13} />
</motion.button>
```

**Add item button** — at the bottom of each accordion section:
```tsx
<button
  onClick={() => addItem(sectionKey)}
  style={{
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: 'var(--text-tertiary)', background: 'transparent',
    border: '1px dashed var(--border-default)', borderRadius: 6,
    padding: '6px 12px', cursor: 'pointer', width: '100%',
    marginTop: 8, transition: 'all 150ms ease',
  }}
  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; e.currentTarget.style.color = 'var(--amber-core)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
>
  <Plus size={12} />
  Add item
</button>
```

`addItem` appends:
```typescript
{ id: crypto.randomUUID(), text: '', source_quote: '', slide_type_hint: null }
```

### 4.3 Local state

```typescript
const [outline, setOutline] = useState<ContentOutline>(() =>
  contentOutline ?? {
    key_themes: [], pain_points: [], stated_priorities: [],
    open_questions: [], potential_recommendations: [], suggested_next_steps: [],
  }
);
```

`updateItem(section, id, field, value)` → immutable update via map.
`deleteItem(section, id)` → filter out by id.
`reorderItems(section, oldIndex, newIndex)` → arrayMove from `@dnd-kit/sortable`.
`addItem(section)` → append new empty item.

### 4.4 Submit

Submit button fixed at the bottom of the panel, outside the accordion:

```tsx
<div style={{
  position: 'sticky', bottom: 0, paddingTop: 16,
  background: 'linear-gradient(to bottom, transparent, var(--surface-base) 40%)',
  display: 'flex', justifyContent: 'flex-end', gap: 10,
}}>
  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', alignSelf: 'center' }}>
    {totalItems} items across {nonEmptySections} sections
  </span>
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={handleSubmit}
    disabled={submitting}
    style={{
      height: 44, padding: '0 28px', borderRadius: 8, border: 'none',
      background: 'var(--amber-core)', color: 'var(--text-inverse)',
      fontSize: 14, fontWeight: 600, cursor: 'pointer',
    }}
  >
    Finalize Outline
  </motion.button>
</div>
```

On submit: call `submitGate3(engagementId, outline, token)`.
On success: SSE drives status to `compiling` then `complete`.
On error: show inline error above the button in coral.

---

## 5. Verification Checklist

```bash
cd frontend
npm run typecheck
npm run build

# Manual:
# 1. Advance a synthetic engagement to awaiting_review_1
# 2. Gate 1 panel expands inline in stepper content area
# 3. Removed segments shown with red strikethrough + reason badges
# 4. Click "Restore" on a segment → turns teal, strikethrough removed
# 5. Click "Looks Good" → submits gate1, status transitions to running
# 6. Advance to awaiting_review_2 (or mock the status)
# 7. Gate 2 table loads with acronym rows
# 8. Click expansion cell → input appears, edit works, source badge → user_edited
# 9. Add a row → new empty row appears at bottom
# 10. Delete a row → animates out
# 11. Submit gate2 → transitions to running
# 12. Advance to awaiting_review_3
# 13. Gate 3 accordion sections all open by default
# 14. Click item text → inline textarea appears
# 15. Drag item within a section → reorders correctly
# 16. Add item → empty row appears at bottom of section
# 17. Delete item → row animates out
# 18. Click "Finalize Outline" → submits gate3, transitions to compiling
```
