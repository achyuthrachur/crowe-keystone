# Keystone — PRD Phase D3: Engagement Detail + Upload + Run
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase D2 complete — Kanban board renders and drag works

---

## Overview

Phase D3 builds the engagement detail page at `/engagements/[id]`.
The layout is a vertical stepper on the left and content on the right.
This phase covers: the stepper shell, the Upload step, and the Run step
(including the confirmation modal and the pipeline-running animated state
with node-by-node progress and live log).

Phase D3 deliverables:
1. `frontend/src/app/(app)/engagements/[id]/page.tsx` — full detail page
2. `frontend/src/components/keystone/PipelineStepper.tsx` — left-side stepper
3. `frontend/src/components/keystone/UploadStep.tsx` — dropzone + file list
4. `frontend/src/components/keystone/RunStep.tsx` — run CTA, modal, running state
5. `frontend/src/components/keystone/RunConfirmModal.tsx` — confirmation dialog
6. `frontend/src/components/keystone/PipelineNodeProgress.tsx` — 6-node sub-rows

Exit criteria: can upload a transcript, open the run confirmation modal, start
the pipeline, and see node-by-node progress update via SSE.

---

## 1. Detail Page — frontend/src/app/(app)/engagements/[id]/page.tsx

```tsx
'use client';

import { use, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { useKeystoneSSE } from '@/hooks/useKeystoneSSE';
import { PipelineStepper } from '@/components/keystone/PipelineStepper';

interface Props { params: Promise<{ id: string }> }

export default function EngagementDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { fetchEngagement, fetchDocuments, fetchRun, activeEngagement, detailLoading } = useKeystoneStore();
  useKeystoneSSE();

  useEffect(() => {
    if (!session?.accessToken || !id) return;
    const token = session.accessToken as string;
    fetchEngagement(id, token);
    fetchDocuments(id, token);
    fetchRun(id, token);
  }, [session?.accessToken, id]);

  if (detailLoading || !activeEngagement) {
    return <DetailSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}
    >
      {/* Back button + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => router.push('/engagements')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-default)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
            {activeEngagement.client_name}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {activeEngagement.client_industry} · {new Date(activeEngagement.engagement_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Two-column layout: stepper left, content right */}
      <div style={{ display: 'flex', gap: 32, flex: 1, minHeight: 0 }}>
        <PipelineStepper engagement={activeEngagement} />
      </div>
    </motion.div>
  );
}

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 4 }}>
      <div style={{ height: 24, width: 200, borderRadius: 6, background: 'var(--surface-input)', animation: 'shimmer 1.6s infinite linear', backgroundSize: '200% 100%' }} />
      <div style={{ height: 12, width: 140, borderRadius: 6, background: 'var(--surface-input)' }} />
    </div>
  );
}
```

---

## 2. PipelineStepper.tsx

The stepper is the left-side navigation and content host for the detail page.
It renders the 5 pipeline steps as a vertical list of numbered circles connected
by a vertical line. The right side renders the active step's content panel.

**Steps:**
```typescript
const PIPELINE_STEPS = [
  { id: 'upload',  label: 'Upload Documents',   number: 1 },
  { id: 'run',     label: 'Run Pipeline',        number: 2 },
  { id: 'gate1',   label: 'Gate 1 — Noise Filter',   number: 3 },
  { id: 'gate2',   label: 'Gate 2 — Glossary',        number: 4 },
  { id: 'gate3',   label: 'Gate 3 — Content Outline', number: 5 },
  { id: 'output',  label: 'Output',              number: 6 },
];
```

**Step states** (derived from `engagement.status`):
- `complete` — circle filled amber, checkmark icon, line below is filled
- `active` — circle filled with status color, number visible, pulsing ring if pipeline is running
- `pending` — circle outlined only, number in muted color
- `error` — circle filled coral, X icon

**Status → active step mapping:**
```typescript
function getActiveStep(status: EngagementStatus): string {
  if (status === 'draft' || status === 'uploading') return 'upload';
  if (status === 'ready') return 'run';
  if (status === 'running' || status === 'compiling') return 'run';
  if (status === 'awaiting_review_1') return 'gate1';
  if (status === 'awaiting_review_2') return 'gate2';
  if (status === 'awaiting_review_3') return 'gate3';
  if (status === 'complete') return 'output';
  if (status === 'failed') return 'run'; // show error on run step
  return 'upload';
}
```

**Pulsing ring** — shown on the active step circle when status is `running` or `compiling`:
```tsx
{isActive && (status === 'running' || status === 'compiling') && (
  <motion.div
    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute', inset: -4,
      borderRadius: '50%',
      border: `2px solid var(--amber-core)`,
    }}
  />
)}
```

**Glowing label** — when `isActive && (running || compiling)`, animate the step label:
```tsx
<motion.span
  animate={isActive && isRunning ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: 13, fontWeight: isActive ? 600 : 400 }}
>
  {step.label}
</motion.span>
```

**Connector line** — the vertical line between circles. Animate the filled portion
using a `scaleY` transform on a div with `transformOrigin: 'top'`:
```tsx
<div style={{ position: 'absolute', left: 15, top: 32, bottom: -8, width: 1, background: 'var(--border-subtle)' }}>
  <motion.div
    initial={{ scaleY: 0 }}
    animate={{ scaleY: isStepComplete ? 1 : 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    style={{ position: 'absolute', inset: 0, background: 'var(--amber-core)', transformOrigin: 'top' }}
  />
</div>
```

**Right content panel** — rendered next to the stepper. Uses `AnimatePresence` with
a fade transition when the active step changes:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeStep}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    style={{ flex: 1 }}
  >
    {activeStep === 'upload' && <UploadStep engagement={engagement} />}
    {(activeStep === 'run' || status === 'running' || status === 'compiling') && <RunStep engagement={engagement} />}
    {activeStep === 'gate1' && <Gate1Panel />}  {/* D4 */}
    {activeStep === 'gate2' && <Gate2Panel />}  {/* D4 */}
    {activeStep === 'gate3' && <Gate3Panel />}  {/* D4 */}
    {activeStep === 'output' && <OutputStep />} {/* D5 */}
  </motion.div>
</AnimatePresence>
```

For D3, `Gate1Panel`, `Gate2Panel`, `Gate3Panel`, and `OutputStep` are stubs
that render a placeholder. D4 and D5 fill them in.

---

## 3. UploadStep.tsx

Dropzone on the left, uploaded file list on the right. Side-by-side layout.

### 3.1 Dropzone

Uses the browser's native drag-and-drop events (`onDragOver`, `onDrop`) and a
hidden `<input type="file">`. Do NOT install `react-dropzone` — implement
natively to keep bundle size down.

Three separate dropzone instances — one per doc_type: transcript, preread, agenda.
The transcript dropzone is required; the other two are labeled optional.

**Visual states:**
- Default: dashed border `var(--border-default)`, muted cloud upload icon, label text
- Drag over: border changes to `var(--amber-core)`, background becomes `var(--amber-glow)`, scale 1.01 via framer-motion
- Uploaded: solid border `var(--teal)`, checkmark, filename shown

**Accepted file types** (shown as hint text below each dropzone):
- Transcript: `.txt .vtt .srt .json .pdf .docx`
- Preread / Agenda: `.pdf .docx .txt`

**Upload error** — shown inline below the dropzone in coral:
```tsx
{error && (
  <motion.p
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ fontSize: 12, color: 'var(--coral)', marginTop: 6 }}
  >
    {error}
  </motion.p>
)}
```

### 3.2 File list (right side)

Shows `activeDocuments` as a list of rows. Each row:
- File icon (lucide `FileText`) colored by doc_type
- Filename (truncated to 32 chars with ellipsis)
- File size in KB/MB
- Doc type badge (Transcript / Preread / Agenda) using `StatusBadge` style
- Upload timestamp

### 3.3 "Run Pipeline" CTA availability

Once at least one transcript is in `activeDocuments`, show a `RunStep` button
at the bottom of the upload section. This button is disabled and grayed until
a transcript exists.

---

## 4. RunStep.tsx

Shown when `status === 'ready'` (pre-run) or `status === 'running' | 'compiling'` (pipeline active).

### 4.1 Pre-run state (status === 'ready')

Shows the run button and metadata summary. Clicking the button opens `RunConfirmModal`.

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
  <div style={{
    padding: '16px 20px', borderRadius: 10,
    background: 'var(--surface-elevated)', border: '1px solid var(--border-default)',
  }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
      Ready to Run
    </h3>
    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
      The transcript has been uploaded and parsed. Starting the pipeline will run
      all 6 nodes sequentially, pausing for your review at Gates 1, 2, and 3.
    </p>
  </div>

  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => setModalOpen(true)}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      height: 48, borderRadius: 10, border: 'none',
      background: 'linear-gradient(135deg, var(--amber-core), var(--amber-dark))',
      color: 'var(--text-inverse)', fontSize: 15, fontWeight: 600,
      cursor: 'pointer', boxShadow: 'var(--shadow-amber)',
    }}
  >
    <Play size={18} />
    Run Pipeline
  </motion.button>
</div>
```

### 4.2 Running state

When `status === 'running' || 'compiling'`:

```
┌─ Pipeline Running ─────────────────────────────────────┐
│  [amber spinner/pulse]  Running pipeline...             │
│                                                         │
│  Node progress (6 sub-rows):                           │
│  ✓ 1. Transcript Ingester       [complete]             │
│  ⟳ 2. Noise Filter              [running — amber pulse] │
│  ○ 3. Research Agent             [pending]              │
│  ○ 4. Disambiguator              [pending]              │
│  ○ 5. Content Extractor          [pending]              │
│  ○ 6. Brief Compiler             [pending]              │
│                                                         │
│  Live log:                                              │
│  > Running noise filter...                              │
└─────────────────────────────────────────────────────────┘
```

Live log: maintain a `string[]` of status messages in local state.
Each time an SSE `agent.node_entered` event arrives for this engagement,
append a message like `"Running ${nodeName.replace(/_/g, ' ')}..."`.
Render as a `<pre>` block with monospace font, max 5 lines visible,
auto-scroll to bottom, dark background `var(--surface-input)`.

**Error state** (status === 'failed'):
```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  style={{
    padding: '14px 16px', borderRadius: 8,
    background: 'var(--coral-glow)', border: '1px solid var(--border-coral)',
  }}
>
  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--coral)', marginBottom: 4 }}>
    Pipeline failed
  </p>
  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
    {activeRun?.error ?? 'An unexpected error occurred. Check the server logs.'}
  </p>
</motion.div>
```

---

## 5. RunConfirmModal.tsx

Uses the existing `@radix-ui/react-dialog` primitive (already installed).
Slides up from center with a backdrop blur.

```tsx
// Animation via framer-motion on the DialogContent inner div:
initial={{ opacity: 0, scale: 0.96, y: 8 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.96, y: 8 }}
transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
```

**Modal content:**
- Title: "Start Pipeline?"
- Body: "This will process the transcript through 6 nodes. You'll be asked to review at Gates 1, 2, and 3 before the final brief is generated."
- Summary row: client name, engagement date, transcript filename
- Two buttons: "Cancel" (ghost) and "Start Pipeline" (amber, same style as run button)

On "Start Pipeline" click:
1. Disable both buttons, show spinner on the confirm button
2. Call `startRun(engagementId, token)` from the store
3. On success: close modal (status will update via SSE)
4. On error: show inline error message in coral below the buttons

---

## 6. PipelineNodeProgress.tsx

Renders the 6-node sub-row list inside the running state.

**Node names** (from `current_node` field on the run):
```typescript
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
```

Determine each node's state:
- All nodes before `current_node` in `NODE_ORDER` → complete (teal checkmark)
- Node matching `current_node` → active (amber spinning ring)
- All nodes after → pending (dim circle)

**Active node animation:**
```tsx
// Spinner ring around the active node circle
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
  style={{
    width: 20, height: 20, borderRadius: '50%',
    border: '2px solid var(--amber-core)',
    borderTopColor: 'transparent',
    position: 'absolute', inset: -2,
  }}
/>
```

Each row fades in with a stagger when first rendered:
```tsx
initial={{ opacity: 0, x: -8 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: index * 0.06, duration: 0.2 }}
```

---

## 7. Verification Checklist

```bash
cd frontend
npm run typecheck
npm run build

# Manual:
# 1. Navigate to /engagements/[id] for a 'draft' engagement
#    → Stepper shows Upload as active step (step 1)
# 2. Drag a .txt file onto the transcript dropzone
#    → Dropzone highlights amber on drag-over
#    → File appears in file list after upload
# 3. File list shows filename, size, doc type badge
# 4. Once transcript uploaded: status advances to 'ready'
#    → "Run Pipeline" button appears, step 2 becomes active
# 5. Click "Run Pipeline"
#    → RunConfirmModal opens with slide-up animation
# 6. Click "Start Pipeline"
#    → Modal closes, stepper step 2 shows pulsing ring
#    → PipelineNodeProgress renders 6 node rows
#    → Current node shows spinning amber ring
# 7. SSE agent.node_entered arrives
#    → Correct node lights up in progress list
#    → Live log appends message
# 8. Pipeline fails: step 2 shows error state inline
```
