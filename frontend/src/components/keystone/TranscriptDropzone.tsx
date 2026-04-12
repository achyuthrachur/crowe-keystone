'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CloudUpload, CheckCircle2 } from 'lucide-react';

interface TranscriptDropzoneProps {
  onFile: (file: File) => void | Promise<void>;
  uploading?: boolean;
  uploaded?: boolean;
  filename?: string;
}

export function TranscriptDropzone({ onFile, uploading = false, uploaded = false, filename }: TranscriptDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      await onFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
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

  return (
    <div>
      <motion.div
        animate={isDragging ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.1 }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploaded && !uploading && inputRef.current?.click()}
        style={{
          borderRadius: 10,
          padding: '32px 24px',
          border: `1.5px dashed ${uploaded ? 'var(--teal)' : isDragging ? 'var(--amber-core)' : 'var(--border-default)'}`,
          background: uploaded ? 'var(--teal-glow)' : isDragging ? 'var(--amber-glow)' : 'var(--surface-overlay)',
          cursor: uploaded || uploading ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          textAlign: 'center',
          transition: 'all 200ms ease',
        }}
      >
        {uploaded ? (
          <CheckCircle2 size={28} color="var(--teal)" />
        ) : (
          <CloudUpload size={28} color={isDragging ? 'var(--amber-core)' : 'var(--text-tertiary)'} />
        )}

        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: uploaded ? 'var(--teal)' : 'var(--text-secondary)', margin: 0 }}>
            {uploaded
              ? (filename ?? 'Uploaded')
              : uploading
              ? 'Uploading…'
              : 'Drop your transcript here, or click to browse'}
          </p>
          {!uploaded && !uploading && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
              Supported: .txt .vtt .srt .json .pdf .docx
            </p>
          )}
        </div>
      </motion.div>

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
        accept=".txt,.vtt,.srt,.json,.pdf,.docx"
        style={{ display: 'none' }}
        onChange={onInputChange}
      />
    </div>
  );
}
