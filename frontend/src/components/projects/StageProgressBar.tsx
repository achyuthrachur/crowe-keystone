'use client';

import { motion } from 'framer-motion';
import { progressFillVariants, conflictPulseVariants } from '@/lib/motion';
import { STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, type Stage } from '@/lib/stage-colors';

interface StageProgressBarProps {
  currentStage: Stage;
}

export function StageProgressBar({ currentStage }: StageProgressBarProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const progressPercent = (currentIndex / (STAGE_ORDER.length - 1)) * 100;

  return (
    <div data-testid="stage-progress-bar" style={{ padding: '16px 32px' }}>
      {/* Stage dots above track */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          position: 'relative',
        }}
      >
        {STAGE_ORDER.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const stageColor = STAGE_COLORS[stage];

          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                flex: '0 0 auto',
              }}
            >
              {isCurrent ? (
                <motion.div
                  variants={conflictPulseVariants}
                  animate="animate"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'var(--amber-core)',
                    border: '2px solid var(--amber-core)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: isCompleted ? 'var(--teal)' : 'transparent',
                    border: `2px solid ${isCompleted ? 'var(--teal)' : 'var(--border-default)'}`,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 10,
                  color: isCurrent ? 'var(--amber-core)' : 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                  fontWeight: isCurrent ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {stageColor.icon}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress track */}
      <div
        style={{
          height: 4,
          background: 'var(--border-subtle)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <motion.div
          variants={progressFillVariants}
          initial="initial"
          animate="animate"
          style={{
            height: '100%',
            background: 'var(--amber-core)',
            borderRadius: 2,
            width: `${progressPercent}%`,
          }}
        />
      </div>

      {/* Stage label */}
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        Stage {currentIndex + 1} of {STAGE_ORDER.length}:{' '}
        <span style={{ color: 'var(--amber-core)', fontWeight: 600 }}>
          {STAGE_LABELS[currentStage]}
        </span>
      </div>
    </div>
  );
}
