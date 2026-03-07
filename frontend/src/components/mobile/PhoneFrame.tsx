interface PhoneFrameProps {
  children: React.ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div
      data-testid="phone-frame"
      style={{
        width: 393,
        height: 852,
        background: '#000',
        borderRadius: 55,
        padding: 12,
        boxShadow: '0 0 0 2px #2a2a2a, 0 0 0 4px #555, 0 80px 160px rgba(0,0,0,0.9)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Dynamic Island */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 37,
          background: '#000',
          borderRadius: 22,
          zIndex: 20,
          boxShadow: '0 0 0 2px #1a1a1a',
        }}
      />

      {/* Side buttons — volume down */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 100,
          width: 3,
          height: 35,
          background: '#333',
          borderRadius: '4px 0 0 4px',
        }}
      />
      {/* Volume up */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 150,
          width: 3,
          height: 65,
          background: '#333',
          borderRadius: '4px 0 0 4px',
        }}
      />
      {/* Mute */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 225,
          width: 3,
          height: 65,
          background: '#333',
          borderRadius: '4px 0 0 4px',
        }}
      />
      {/* Power button */}
      <div
        style={{
          position: 'absolute',
          right: -3,
          top: 170,
          width: 3,
          height: 80,
          background: '#333',
          borderRadius: '0 4px 4px 0',
        }}
      />

      {/* Screen */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--surface-base)',
          borderRadius: 44,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
