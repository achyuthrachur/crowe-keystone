'use client';

interface SkeletonProps { opacity?: number; }

export function EngagementCardSkeleton({ opacity = 1 }: SkeletonProps) {
  return (
    <div
      style={{
        borderRadius: 8, padding: '12px 14px', opacity,
        background: 'var(--surface-overlay)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Shimmer overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s infinite linear',
        }}
      />
      {/* Skeleton lines */}
      <div style={{ height: 14, width: '65%', borderRadius: 6, background: 'var(--surface-input)', marginBottom: 10 }} />
      <div style={{ height: 10, width: '40%', borderRadius: 6, background: 'var(--surface-input)', marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--surface-input)' }} />
        ))}
      </div>
      <div style={{ height: 10, width: '30%', borderRadius: 6, background: 'var(--surface-input)' }} />
    </div>
  );
}
