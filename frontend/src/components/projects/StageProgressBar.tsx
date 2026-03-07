'use client';

import { useEffect, useRef } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { conflictPulseVariants, DURATION } from '@/lib/motion';
import { STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, type Stage } from '@/lib/stage-colors';

interface StageProgressBarProps {
  currentStage: Stage;
  onStageChange?: (newStage: Stage, prevStage: Stage) => void;
}

export function StageProgressBar({ currentStage, onStageChange }: StageProgressBarProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const progressPercent = (currentIndex / (STAGE_ORDER.length - 1)) * 100;

  const shouldReduce = useReducedMotion();
  const fillControls = useAnimation();
  const prevStageRef = useRef<Stage>(currentStage);

  // Animate the progress fill whenever currentStage changes
  useEffect(() => {
    const prev = prevStageRef.current;
    if (prev !== currentStage) {
      onStageChange?.(currentStage, prev);
      prevStageRef.current = currentStage;

      if (!shouldReduce) {
        // Re-run fill animation on advance: start from current % and animate to new %
        void fillControls.start({
          width: `${progressPercent}%`,
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        });
      }
    }
  }, [currentStage, progressPercent, shouldReduce, fillControls, onStageChange]);

  return (
    <div data-testid="stage-progress-bar" style={{ padding: '16px 32px' }}>
      {/* Stage dots + labels */}
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
              {/* Dot */}
              {isCurrent ? (
                <motion.div
                  variants={shouldReduce ? undefined : conflictPulseVariants}
                  animate={shouldReduce ? undefined : 'animate'}
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
                    transition: `background ${DURATION.normal}s ease, border-color ${DURATION.normal}s ease`,
                  }}
                />
              )}

              {/* Stage icon label */}
              <span
                style={{
                  fontSize: 10,
                  color: isCurrent ? 'var(--amber-core)' : 'var(--text-tertiary)',
                  fontFamily: 'var(--font-geist-sans)',
                  fontWeight: isCurrent ? 600 : 400,
                  whiteSpace: 'nowrap',
                  transition: `color ${DURATION.normal}s ease`,
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
          animate={fillControls}
          initial={{ width: `${progressPercent}%` }}
          style={{
            height: '100%',
            background: 'var(--amber-core)',
            borderRadius: 2,
          }}
        />
      </div>

      {/* Stage label text */}
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
