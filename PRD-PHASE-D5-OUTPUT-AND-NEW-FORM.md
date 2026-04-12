# Keystone — PRD Phase D5: Output Page + New Engagement Form
> Version 1.0 | Status: Draft | Author: Achyuth Rachur
> Prereq: Phase D4 complete — all three HITL gates submit correctly

---

## Overview

Phase D5 finishes the UI. Two deliverables: the output download page and
the new engagement creation form. After D5, the full end-to-end user journey
is completable in the browser.

Phase D5 deliverables:
1. `frontend/src/components/keystone/OutputStep.tsx` — wired into the detail page stepper
2. `frontend/src/app/(app)/engagements/new/page.tsx` — full creation form

Exit criteria: a complete pipeline run produces downloadable output files,
and new engagements can be created and immediately have a transcript uploaded.

---

## 1. OutputStep.tsx

**Trigger:** `engagement.status === 'complete'`

Rendered as step 6 content inside `PipelineStepper` when the active step is `output`.

### 1.1 Layout

```
┌─ Pipeline Complete ──────────────────────────────────────────┐
│                                                              │
│  [Animated checkmark]                                        │
│  "Deck brief ready"                                          │
│  "Generated [date] · [slide count] suggested slides"         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄  Deck Brief (.docx)          [Download]         │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  { }  Deck Handoff (.json)       [Download]         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [+ Start New Engagement]                                    │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Animated checkmark entrance

When the output panel first mounts (status just became complete), play a
one-shot entrance animation on the checkmark:

```tsx
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
  style={{
    width: 56, height: 56, borderRadius: '50%',
    background: 'var(--teal-glow)',
    border: '2px solid var(--teal)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  }}
>
  <motion.div
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
  >
    <CheckCircle2 size={28} color="var(--teal)" />
  </motion.div>
</motion.div>
```

Below the checkmark:
```tsx
<h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
  Deck brief ready
</h2>
<p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
  Generated {new Date(activeRun?.completed_at ?? '').toLocaleString()}
</p>
```

### 1.3 Download buttons

Fetch output availability on mount via `GET /engagements/{id}/output`.
Store the result in local state. While loading, show skeleton buttons.

```typescript
const [outputFiles, setOutputFiles] = useState<OutputFiles | null>(null);
const [outputLoading, setOutputLoading] = useState(true);

useEffect(() => {
  if (!session?.accessToken || !engagement.id) return;
  fetch(`${API}/api/v1/engagements/${engagement.id}/output`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
    .then((r) => r.json())
    .then(setOutputFiles)
    .finally(() => setOutputLoading(false));
}, [engagement.id, session?.accessToken]);
```

**Download button component** — used for both files:
```tsx
interface DownloadButtonProps {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
}

function DownloadButton({ label, subtitle, icon, href, available }: DownloadButtonProps) {
  return (
    <motion.a
      href={available ? `${API}${href}` : undefined}
      download
      whileHover={available ? { scale: 1.01, y: -1 } : {}}
      whileTap={available ? { scale: 0.98 } : {}}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', borderRadius: 10,
        background: 'var(--surface-elevated)',
        border: `1px solid ${available ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        textDecoration: 'none',
        cursor: available ? 'pointer' : 'not-allowed',
        opacity: available ? 1 : 0.5,
        boxShadow: available ? 'var(--shadow-sm)' : 'none',
        transition: 'all 150ms ease',
      }}
    >
      {/* File icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: 'var(--surface-overlay)',
        border: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>

      {/* Label + subtitle */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          {subtitle}
        </p>
      </div>

      {/* Download icon */}
      {available && (
        <Download size={16} color="var(--text-tertiary)" />
      )}
    </motion.a>
  );
}
```

Usage:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
  <DownloadButton
    label="Deck Brief"
    subtitle="Word document · Crowe-branded outline"
    icon={<FileText size={20} color="var(--blue)" />}
    href={outputFiles?.deck_brief_download_url ?? ''}
    available={outputFiles?.deck_brief_available ?? false}
  />
  <DownloadButton
    label="Deck Handoff"
    subtitle="JSON · Machine-readable for Claude Code"
    icon={<Braces size={20} color="var(--teal)" />}
    href={outputFiles?.deck_handoff_download_url ?? ''}
    available={outputFiles?.deck_handoff_available ?? false}
  />
</div>
```

Import `Braces` from lucide-react (represents JSON). If not available in the
installed version, use `Code2` or `FileJson` instead.

### 1.4 "Start New Engagement" button

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  onClick={() => router.push('/engagements/new')}
  style={{
    display: 'flex', alignItems: 'center', gap: 8,
    height: 40, padding: '0 20px', borderRadius: 8, marginTop: 24,
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all 150ms ease',
  }}
  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; e.currentTarget.style.color = 'var(--amber-core)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
>
  <Plus size={14} />
  Start New Engagement
</motion.button>
```

---

## 2. New Engagement Form — /engagements/new

### 2.1 Page layout

Full page with a centered, max-width-640 form card. Same fade-in page transition
as all other pages (`initial={{ opacity: 0 }} animate={{ opacity: 1 }}`).

```
← Back to Engagements

New Engagement
Create a new discovery session engagement

┌──────────────────────────────────────────┐
│  Client Name *                            │
│  [text input]                             │
│                                           │
│  Engagement Date *                        │
│  [date picker]                            │
│                                           │
│  Attendees                                │
│  [textarea — who attended the session]    │
│                                           │
│  [Cancel]          [Create Engagement →]  │
└──────────────────────────────────────────┘
```

After successful creation, the form transitions into an upload section on the
same page (not a navigation — the form slides up out and the upload UI slides in).

### 2.2 Form fields

**Client Name** — required text input.

Validation: non-empty, max 200 chars. Show character count `{n}/200` in gray
below the input when the user starts typing.

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
    Client Name <span style={{ color: 'var(--coral)' }}>*</span>
  </label>
  <input
    value={clientName}
    onChange={(e) => setClientName(e.target.value)}
    placeholder="e.g. First Midwest Bank"
    maxLength={200}
    style={{
      height: 44, padding: '0 14px', borderRadius: 8,
      background: 'var(--surface-input)',
      border: `1px solid ${clientNameError ? 'var(--coral)' : 'var(--border-default)'}`,
      color: 'var(--text-primary)', fontSize: 14,
      fontFamily: 'var(--font-geist-sans)', outline: 'none',
      transition: 'border-color 150ms ease',
    }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; }}
    onBlur={(e) => { e.currentTarget.style.borderColor = clientNameError ? 'var(--coral)' : 'var(--border-default)'; }}
  />
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    {clientNameError && (
      <span style={{ fontSize: 11, color: 'var(--coral)' }}>{clientNameError}</span>
    )}
    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
      {clientName.length}/200
    </span>
  </div>
</div>
```

**Engagement Date** — required date input. Use native `<input type="date">` —
do not install a date picker library. Style to match the design system:

```tsx
<input
  type="date"
  value={engagementDate}
  onChange={(e) => setEngagementDate(e.target.value)}
  style={{
    height: 44, padding: '0 14px', borderRadius: 8,
    background: 'var(--surface-input)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)', fontSize: 14,
    fontFamily: 'var(--font-geist-sans)', outline: 'none',
    colorScheme: 'dark', // makes the browser date picker dark-themed
    width: '100%',
  }}
/>
```

**Attendees** — optional textarea. Placeholder: "e.g. CRO, Head of Model Risk, Internal Audit Director"

```tsx
<textarea
  value={attendees}
  onChange={(e) => setAttendees(e.target.value)}
  placeholder="e.g. CRO, Head of Model Risk, Internal Audit Director"
  rows={3}
  maxLength={2000}
  style={{
    padding: '12px 14px', borderRadius: 8,
    background: 'var(--surface-input)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)', fontSize: 14,
    fontFamily: 'var(--font-geist-sans)', outline: 'none',
    resize: 'vertical', lineHeight: 1.6, width: '100%',
    boxSizing: 'border-box', transition: 'border-color 150ms ease',
  }}
  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; }}
  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
/>
```

### 2.3 Form submit

**Buttons row:**
```tsx
<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
  <motion.button
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => router.push('/engagements')}
    type="button"
    style={{
      height: 44, padding: '0 20px', borderRadius: 8,
      background: 'transparent', border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
    }}
  >
    Cancel
  </motion.button>
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={handleCreate}
    disabled={creating}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: 44, padding: '0 24px', borderRadius: 8,
      background: 'var(--amber-core)', border: 'none',
      color: 'var(--text-inverse)', fontSize: 14, fontWeight: 600,
      cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1,
    }}
  >
    {creating ? <Spinner size={14} /> : <ArrowRight size={14} />}
    {creating ? 'Creating...' : 'Create Engagement'}
  </motion.button>
</div>
```

**Validation before submit:**
- `clientName.trim()` must not be empty
- `engagementDate` must not be empty

If validation fails: set error states, scroll to first error, do not call API.

**On success:** the form card slides up and out, replaced by an upload card.

```tsx
// Transition between form and upload
const [created, setCreated] = useState<Engagement | null>(null);

// In the return:
<AnimatePresence mode="wait">
  {!created ? (
    <motion.div
      key="form"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Form card */}
    </motion.div>
  ) : (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
    >
      <PostCreationUpload engagement={created} />
    </motion.div>
  )}
</AnimatePresence>
```

### 2.4 PostCreationUpload component

Shown after creation succeeds. Simplified — transcript upload only (required),
no preread/agenda here (user can add those from the detail page).

```
✓ Engagement created — First Midwest Bank

Upload a transcript to get started

[  Drop your transcript here, or click to browse  ]
[  Supported: .txt .vtt .srt .json .pdf .docx     ]

[Skip for now]     [Go to Engagement →]
```

Uses the same dropzone logic as `UploadStep.tsx` — extract the dropzone
into a shared `TranscriptDropzone` component that both pages import.

On successful upload → navigate to `/engagements/[created.id]`.
On "Skip for now" → navigate to `/engagements/[created.id]`.
On "Go to Engagement" (before upload) → navigate to `/engagements/[created.id]`.

```tsx
function PostCreationUpload({ engagement }: { engagement: Engagement }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { uploadDocument } = useKeystoneStore();
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!session?.accessToken) return;
    setUploading(true);
    try {
      await uploadDocument(engagement.id, file, 'transcript', session.accessToken as string);
      router.push(`/engagements/${engagement.id}`);
    } catch (err) {
      // show error inline
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Success message */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 8,
        background: 'var(--teal-glow)', border: '1px solid var(--border-teal)',
      }}>
        <CheckCircle2 size={16} color="var(--teal)" />
        <span style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>
          Engagement created — {engagement.client_name}
        </span>
      </div>

      {/* Transcript dropzone */}
      <TranscriptDropzone onFile={handleFile} uploading={uploading} />

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.push(`/engagements/${engagement.id}`)}
          style={{ /* ghost button */ }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
```

---

## 3. Spinner component

Used across all submit buttons. Inline SVG — no external library:

```tsx
// frontend/src/components/keystone/Spinner.tsx
export function Spinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" strokeOpacity="0.2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
```

Add to `globals.css`:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 4. CONTEXT.md + HANDOFF.md update after D5

When D5 is complete, update CONTEXT.md:
- Mark Phase D complete under "What Has Been Built"
- Remove Phase D items from "What Remains to Be Built"
- Update PRD table with D1–D5 entries
- Update "Last updated" date

Write HANDOFF.md with:
- All files created/modified across D1–D5
- pytest status (backend unchanged — should still pass)
- npm run typecheck and build status
- Confirmation that full end-to-end user journey works in the browser:
  create engagement → upload transcript → run pipeline → review 3 gates → download outputs

---

## 5. Verification Checklist

```bash
cd frontend
npm run typecheck
npm run build

# Full end-to-end manual test:
# 1. /engagements/new
#    → Form loads with fade-in
#    → Client Name validation fires on empty submit
#    → Date field shows native dark-themed date picker
#    → Submit creates engagement, form slides up, upload section slides in
#    → Success banner shows client name in teal
#    → Drag a .txt onto the dropzone → uploads, navigates to /engagements/[id]
#
# 2. Output step:
#    → Advance a synthetic engagement to complete status (or mock it)
#    → Step 6 becomes active in stepper
#    → Animated teal checkmark plays on mount
#    → "Deck Brief" and "Deck Handoff" download buttons appear
#    → Click "Deck Brief" → .docx downloads
#    → Click "Deck Handoff" → .json downloads
#    → "Start New Engagement" button navigates to /engagements/new
#
# 3. Full run: /engagements/new → create → upload → run → gate1 → gate2 → gate3 → output
#    Every step transitions correctly, no console errors, no TypeScript errors
```
