'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import { TranscriptDropzone } from '@/components/keystone/TranscriptDropzone';
import { Spinner } from '@/components/keystone/Spinner';
import type { Engagement } from '@/types/keystone.types';

export default function NewEngagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { createEngagement, uploadDocument } = useKeystoneStore();
  const token = (session as unknown as { accessToken?: string })?.accessToken ?? '';

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientIndustry, setClientIndustry] = useState('');
  const [engagementDate, setEngagementDate] = useState('');
  const [attendees, setAttendees] = useState('');

  // Errors
  const [clientNameError, setClientNameError] = useState('');
  const [clientIndustryError, setClientIndustryError] = useState('');
  const [engagementDateError, setEngagementDateError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [creating, setCreating] = useState(false);

  // Post-creation state
  const [created, setCreated] = useState<Engagement | null>(null);

  function validate(): boolean {
    let valid = true;
    if (!clientName.trim()) { setClientNameError('Client name is required'); valid = false; }
    else setClientNameError('');
    if (!clientIndustry.trim()) { setClientIndustryError('Client industry is required'); valid = false; }
    else setClientIndustryError('');
    if (!engagementDate) { setEngagementDateError('Engagement date is required'); valid = false; }
    else setEngagementDateError('');
    return valid;
  }

  async function handleCreate() {
    if (!validate()) return;
    setCreating(true);
    setSubmitError('');
    try {
      const engagement = await createEngagement({
        client_name: clientName.trim(),
        client_industry: clientIndustry.trim(),
        engagement_date: engagementDate,
        attendees: attendees.trim(),
      }, token);
      setCreated(engagement);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create engagement');
    } finally {
      setCreating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <button
          onClick={() => router.push('/engagements')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid var(--border-default)',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--text-secondary)', transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
            New Engagement
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Create a new discovery session engagement
          </p>
        </div>
      </div>

      {/* Form / Upload card */}
      <div style={{ maxWidth: 640, width: '100%' }}>
        <AnimatePresence mode="wait">
          {!created ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                padding: '28px 32px', borderRadius: 12,
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
                display: 'flex', flexDirection: 'column', gap: 20,
              }}
            >
              {/* Client Name */}
              <Field label="Client Name" required error={clientNameError}>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. First Midwest Bank"
                  maxLength={200}
                  style={{
                    ...inputStyle,
                    borderColor: clientNameError ? 'var(--coral)' : 'var(--border-default)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = clientNameError ? 'var(--coral)' : 'var(--border-default)'; }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{clientName.length}/200</span>
                </div>
              </Field>

              {/* Client Industry */}
              <Field label="Client Industry" required error={clientIndustryError}>
                <input
                  value={clientIndustry}
                  onChange={(e) => setClientIndustry(e.target.value)}
                  placeholder="e.g. Community Banking, Property & Casualty Insurance"
                  maxLength={200}
                  style={{
                    ...inputStyle,
                    borderColor: clientIndustryError ? 'var(--coral)' : 'var(--border-default)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = clientIndustryError ? 'var(--coral)' : 'var(--border-default)'; }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{clientIndustry.length}/200</span>
                </div>
              </Field>

              {/* Engagement Date */}
              <Field label="Engagement Date" required error={engagementDateError}>
                <input
                  type="date"
                  value={engagementDate}
                  onChange={(e) => setEngagementDate(e.target.value)}
                  style={{
                    ...inputStyle,
                    colorScheme: 'dark',
                    borderColor: engagementDateError ? 'var(--coral)' : 'var(--border-default)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--amber-core)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = engagementDateError ? 'var(--coral)' : 'var(--border-default)'; }}
                />
              </Field>

              {/* Attendees */}
              <Field label="Attendees" error="">
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
              </Field>

              {/* Submit error */}
              {submitError && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 12, color: 'var(--coral)', margin: 0 }}
                >
                  {submitError}
                </motion.p>
              )}

              {/* Button row */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
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
                  {creating ? <Spinner size={14} color="rgba(0,0,0,0.4)" /> : <ArrowRight size={14} />}
                  {creating ? 'Creating…' : 'Create Engagement'}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            >
              <PostCreationUpload engagement={created} token={token} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label}
        {required && <span style={{ color: 'var(--coral)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: 11, color: 'var(--coral)' }}
        >
          {error}
        </motion.span>
      )}
    </div>
  );
}

// ── Post-creation upload ──────────────────────────────────────────────────────

function PostCreationUpload({ engagement, token }: { engagement: Engagement; token: string }) {
  const router = useRouter();
  const { uploadDocument } = useKeystoneStore();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    try {
      await uploadDocument(engagement.id, file, 'transcript', token);
      setFilename(file.name);
      setUploaded(true);
      // Navigate after brief pause so user sees the success state
      setTimeout(() => router.push(`/engagements/${engagement.id}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      padding: '28px 32px', borderRadius: 12,
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border-default)',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Success banner */}
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
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>
          Upload a transcript to get started
        </h3>
        <TranscriptDropzone
          onFile={handleFile}
          uploading={uploading}
          uploaded={uploaded}
          filename={filename}
        />
        {error && (
          <p style={{ fontSize: 12, color: 'var(--coral)', marginTop: 6 }}>{error}</p>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.push(`/engagements/${engagement.id}`)}
          style={{
            height: 36, padding: '0 16px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border-default)',
            color: 'var(--text-tertiary)', fontSize: 13, cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          {uploaded ? 'Go to Engagement →' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 44, padding: '0 14px', borderRadius: 8,
  background: 'var(--surface-input)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)', fontSize: 14,
  fontFamily: 'var(--font-geist-sans)', outline: 'none',
  transition: 'border-color 150ms ease',
  width: '100%', boxSizing: 'border-box',
};
