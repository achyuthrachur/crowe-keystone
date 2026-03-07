'use client';

import type { OpenQuestion } from '@/types/prd.types';

interface OpenQuestionBlockProps {
  question: OpenQuestion;
  onAnswer?: (id: string, answer: string) => void;
}

export function OpenQuestionBlock({ question, onAnswer }: OpenQuestionBlockProps) {
  const isBlocking = question.blocking;

  return (
    <div
      style={{
        borderRadius: 8,
        borderLeft: `3px solid ${isBlocking ? 'var(--coral)' : 'var(--border-default)'}`,
        background: isBlocking ? 'var(--coral-glow)' : 'var(--surface-elevated)',
        padding: '10px 14px',
        border: `1px solid ${isBlocking ? 'var(--coral)' : 'var(--border-subtle)'}`,
        borderLeftWidth: 3,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        {/* Status indicator */}
        <span
          style={{
            fontSize: 14,
            flexShrink: 0,
            marginTop: 1,
            lineHeight: 1,
          }}
          aria-label={isBlocking ? 'Blocking question' : 'Non-blocking question'}
        >
          {isBlocking ? '\u26D4' : '\u25CB'}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Blocking badge */}
          {isBlocking && (
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--coral)',
                background: 'var(--coral-glow)',
                border: '1px solid var(--coral)',
                borderRadius: 4,
                padding: '1px 6px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-geist-sans)',
                marginBottom: 6,
              }}
            >
              Blocking
            </span>
          )}

          {/* Question text */}
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {question.question}
          </p>

          {/* Owner */}
          {question.owner && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 11,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              Owner: {question.owner}
            </p>
          )}

          {/* Answer / Answer link */}
          {question.answered && question.answer ? (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-sans)',
                lineHeight: 1.5,
              }}
            >
              {question.answer}
            </p>
          ) : (
            onAnswer && (
              <button
                onClick={() => {
                  const answer = window.prompt('Enter your answer:');
                  if (answer && answer.trim()) {
                    onAnswer(question.id, answer.trim());
                  }
                }}
                style={{
                  marginTop: 6,
                  background: 'none',
                  border: 'none',
                  color: 'var(--amber-core)',
                  fontSize: 12,
                  fontFamily: 'var(--font-geist-sans)',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  fontWeight: 500,
                }}
              >
                Answer
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
