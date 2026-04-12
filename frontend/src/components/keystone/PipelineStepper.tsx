'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { UploadStep } from './UploadStep';
import { RunStep } from './RunStep';
import { Gate1Panel } from './Gate1Panel';
import { Gate2Panel } from './Gate2Panel';
import { Gate3Panel } from './Gate3Panel';
import { OutputStep } from './OutputStep';
import type { Engagement, EngagementStatus } from '@/types/keystone.types';

// ── Step definitions ──────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { id: 'upload',  label: 'Upload Documents',       number: 1 },
  { id: 'run',     label: 'Run Pipeline',            number: 2 },
  { id: 'gate1',   label: 'Gate 1 — Noise Filter',  number: 3 },
  { id: 'gate2',   label: 'Gate 2 — Glossary',      number: 4 },
  { id: 'gate3',   label: 'Gate 3 — Content Outline', number: 5 },
  { id: 'output',  label: 'Output',                  number: 6 },
];

function getActiveStep(status: EngagementStatus): string {
  if (status === 'draft' || status === 'uploading') return 'upload';
  if (status === 'ready') return 'run';
  if (status === 'running' || status === 'compiling') return 'run';
  if (status === 'awaiting_review_1') return 'gate1';
  if (status === 'awaiting_review_2') return 'gate2';
  if (status === 'awaiting_review_3') return 'gate3';
  if (status === 'complete') return 'output';
  if (status === 'failed') return 'run';
  return 'upload';
}

function getStepState(stepId: string, activeStep: string, status: EngagementStatus): 'complete' | 'active' | 'error' | 'pending' {
  const stepOrder = PIPELINE_STEPS.map((s) => s.id);
  const activeIdx = stepOrder.indexOf(activeStep);
  const stepIdx = stepOrder.indexOf(stepId);

  if (status === 'failed' && stepId === 'run') return 'error';
  if (stepIdx < activeIdx) return 'complete';
  if (stepIdx === activeIdx) return 'active';
  return 'pending';
}



// ── Component ─────────────────────────────────────────────────────────────────

interface PipelineStepperProps {
  engagement: Engagement;
  token: string;
}

export function PipelineStepper({ engagement, token }: PipelineStepperProps) {
  const { status } = engagement;
  const activeStep = getActiveStep(status);
  const isRunning = status === 'running' || status === 'compiling';

  return (
    <div style={{ display: 'flex', gap: 32, flex: 1, minHeight: 0 }}>
      {/* Left: vertical stepper */}
      <div style={{ width: 220, flexShrink: 0, paddingTop: 4 }}>
        {PIPELINE_STEPS.map((step, index) => {
          const state = getStepState(step.id, activeStep, status);
          const isActive = state === 'active';
          const isComplete = state === 'complete';
          const isError = state === 'error';
          const isPending = state === 'pending';
          const isLast = index === PIPELINE_STEPS.length - 1;

          return (
            <div key={step.id} style={{ position: 'relative', display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 8 }}>
              {/* Connector line */}
              {!isLast && (
                <div style={{ position: 'absolute', left: 15, top: 32, bottom: -8, width: 1, background: 'var(--border-subtle)', zIndex: 0 }}>
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: isComplete ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{ position: 'absolute', inset: 0, background: 'var(--amber-core)', transformOrigin: 'top' }}
                  />
                </div>
              )}

              {/* Step circle */}
              <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
                {/* Pulsing ring for running state */}
                {isActive && isRunning && (
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute', inset: -4, borderRadius: '50%',
                      border: '2px solid var(--amber-core)',
                    }}
                  />
                )}

                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isComplete || isError
                    ? 'none'
                    : `1.5px solid ${isActive ? 'var(--amber-core)' : 'var(--border-default)'}`,
                  background: isComplete
                    ? 'var(--amber-core)'
                    : isError
                    ? 'var(--coral)'
                    : isActive
                    ? 'var(--amber-glow)'
                    : 'var(--surface-overlay)',
                }}>
                  {isComplete && <Check size={14} color="var(--text-inverse)" strokeWidth={2.5} />}
                  {isError && <X size={14} color="white" strokeWidth={2.5} />}
                  {(isActive || isPending) && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: isActive ? 'var(--amber-core)' : 'var(--text-tertiary)',
                    }}>
                      {step.number}
                    </span>
                  )}
                </div>
              </div>

              {/* Step label */}
              <div style={{ paddingTop: 6 }}>
                <motion.span
                  animate={isActive && isRunning ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
                  transition={{ duration: 1.5, repeat: isActive && isRunning ? Infinity : 0, ease: 'easeInOut' }}
                  style={{
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? 'var(--text-primary)'
                      : isComplete
                      ? 'var(--text-secondary)'
                      : isError
                      ? 'var(--coral)'
                      : 'var(--text-tertiary)',
                    display: 'block', lineHeight: 1.4,
                  }}
                >
                  {step.label}
                </motion.span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: active step content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ height: '100%' }}
          >
            {activeStep === 'upload' && <UploadStep engagement={engagement} token={token} />}
            {(activeStep === 'run' || status === 'running' || status === 'compiling') && (
              <RunStep engagement={engagement} token={token} />
            )}
            {activeStep === 'gate1' && <Gate1Panel engagement={engagement} token={token} />}
            {activeStep === 'gate2' && <Gate2Panel engagement={engagement} token={token} />}
            {activeStep === 'gate3' && <Gate3Panel engagement={engagement} token={token} />}
            {activeStep === 'output' && <OutputStep engagement={engagement} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
