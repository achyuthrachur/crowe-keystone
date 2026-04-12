'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CloudUpload, FileText, CheckCircle2 } from 'lucide-react';
import { useKeystoneStore } from '@/stores/keystone.store';
import type { Engagement } from '@/types/keystone.types';

const DOC_TYPES = [
  {
    id: 'transcript' as const,
    label: 'Transcript',
    required: true,
    hint: '.txt  .vtt  .srt  .json  .pdf  .docx',
    color: 'var(--amber-core)',
  },
  {
    id: 'preread' as const,
    label: 'Pre-read',
    required: false,
    hint: '.pdf  .docx  .txt',
    color: 'var(--blue)',
  },
  {
    id: 'agenda' as const,
    label: 'Agenda',
    required: false,
    hint: '.pdf  .docx  .txt',
    color: 'var(--teal)',
  },
];

const DOC_COLORS: Record<string, string> = {
  transcript: 'var(--amber-core)',
  preread: 'var(--blue)',
  agenda: 'var(--teal)',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

interface UploadStepProps {
  engagement: Engagement;
  token: string;
}

export function UploadStep({ engagement, token }: UploadStepProps) {
  const { uploadDocument, activeDocuments } = useKeystoneStore();

  return (
    <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
      {/* Left: dropzones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 280, flexShrink: 0 }}>
        {DOC_TYPES.map((dt) => {
          const existing = activeDocuments.find((d) => d.doc_type === dt.id);
          return (
            <DropZone
              key={dt.id}
              docType={dt.id}
              label={dt.label}
              hint={dt.hint}
              required={dt.required}
              accentColor={dt.color}
              uploaded={existing?.original_filename ?? null}
              engagementId={engagement.id}
              token={token}
              onUploaded={(file, docType) => uploadDocument(engagement.id, file, docType, token)}
            />
          );
        })}
      </div>

      {/* Right: file list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Uploaded Files
        </h3>
        {activeDocuments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No files uploaded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeDocuments.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--surface-overlay)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <FileText size={16} color={DOC_COLORS[doc.doc_type] ?? 'var(--text-tertiary)'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.original_filename.length > 32 ? doc.original_filename.slice(0, 32) + '…' : doc.original_filename}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                    {formatBytes(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                  background: `${DOC_COLORS[doc.doc_type]}18`,
                  color: DOC_COLORS[doc.doc_type] ?? 'var(--text-secondary)',
                  border: `1px solid ${DOC_COLORS[doc.doc_type]}40`,
                  textTransform: 'capitalize',
                }}>
                  {doc.doc_type}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DropZoneProps {
  docType: 'transcript' | 'preread' | 'agenda';
  label: string;
  hint: string;
  required: boolean;
  accentColor: string;
  uploaded: string | null;
  engagementId: string;
  token: string;
  onUploaded: (file: File, docType: 'transcript' | 'preread' | 'agenda') => Promise<unknown>;
}

function DropZone({ docType, label, hint, required, accentColor, uploaded, onUploaded }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      await onUploaded(file, docType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() { setIsDragging(false); }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  const isUploaded = !!uploaded;

  return (
    <div>
      <motion.div
        animate={isDragging ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.1 }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploaded && inputRef.current?.click()}
        style={{
          borderRadius: 8, padding: '14px 16px',
          border: `1.5px dashed ${isUploaded ? accentColor : isDragging ? accentColor : 'var(--border-default)'}`,
          background: isDragging ? `${accentColor}0d` : isUploaded ? `${accentColor}0a` : 'var(--surface-overlay)',
          cursor: isUploaded ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          textAlign: 'center',
          transition: 'border-color 150ms, background 150ms',
        }}
      >
        {isUploaded ? (
          <CheckCircle2 size={22} color={accentColor} />
        ) : (
          <CloudUpload size={22} color={isDragging ? accentColor : 'var(--text-tertiary)'} />
        )}

        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: isUploaded ? accentColor : 'var(--text-secondary)', margin: 0 }}>
            {isUploaded
              ? uploaded!.length > 28 ? uploaded!.slice(0, 28) + '…' : uploaded
              : label}
            {required && !isUploaded && (
              <span style={{ color: 'var(--coral)', marginLeft: 3 }}>*</span>
            )}
          </p>
          {!isUploaded && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
              {uploading ? 'Uploading…' : 'Drop or click'}
            </p>
          )}
        </div>
      </motion.div>

      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4, textAlign: 'center' }}>
        {hint}{!required && ' · optional'}
      </p>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 12, color: 'var(--coral)', marginTop: 6 }}
        >
          {error}
        </motion.p>
      )}

      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onInputChange}
      />
    </div>
  );
}
