'use client';

interface MobileTopBarProps {
  title: string;
  action?: React.ReactNode;
}

export function MobileTopBar({ title, action }: MobileTopBarProps) {
  return (
    <header
      data-testid="mobile-top-bar"
      style={{
        height: 48,
        background: 'var(--surface-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        {title}
      </span>
      {action && (
        <div style={{ display: 'flex', alignItems: 'center' }}>{action}</div>
      )}
    </header>
  );
}
