'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';
import {
  qrPulseVariants,
  installStepVariants,
  listContainerVariants,
  authPageVariants,
} from '@/lib/motion';

const APP_URL = 'https://crowe-keystone.vercel.app';

type OS = 'ios' | 'android' | 'other';

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

function detectBrowser(): 'safari' | 'chrome' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (/safari/.test(ua) && !/chrome/.test(ua)) return 'safari';
  if (/chrome/.test(ua)) return 'chrome';
  return 'other';
}

const IOS_STEPS = [
  { icon: '1', title: 'Open Safari', desc: 'Navigate to: crowe-keystone.vercel.app — PWA installation only works in Safari on iPhone.' },
  { icon: '2', title: 'Tap the Share button', desc: 'The share icon is the box with an arrow pointing up at the bottom of Safari.' },
  { icon: '3', title: 'Tap "Add to Home Screen"', desc: 'Scroll down in the share sheet if needed.' },
  { icon: '4', title: 'Name it "Keystone" and tap Add', desc: 'The Keystone icon now appears on your home screen.' },
  { icon: '5', title: 'Open from home screen', desc: 'Always open from the home screen icon for the full-screen experience.' },
  { icon: '6', title: 'Allow notifications when prompted', desc: 'Tap "Allow" to receive approval requests, conflict alerts, and daily briefings.' },
];

const ANDROID_STEPS = [
  { icon: '1', title: 'Open Chrome', desc: 'Navigate to: crowe-keystone.vercel.app' },
  { icon: '2', title: 'Tap "Install" when prompted', desc: 'Chrome shows an install banner automatically.' },
  { icon: '3', title: 'No banner? Tap the menu', desc: 'Select "Add to Home Screen" or "Install App".' },
  { icon: '4', title: 'Tap "Install"', desc: 'Keystone appears on your home screen and in your app drawer.' },
  { icon: '5', title: 'Open from home screen', desc: 'On first open, tap "Allow" for notifications.' },
];

const NOTIFICATION_TYPES = [
  { icon: '✓', label: 'Approval requests', desc: 'When your sign-off is needed' },
  { icon: '⚠', label: 'Conflict alerts', desc: 'When two projects clash' },
  { icon: '◎', label: 'Agent checkpoints', desc: 'When AI needs your input' },
  { icon: '◈', label: 'Daily briefings', desc: 'Your 7am project summary' },
];

export default function InstallPage() {
  const [os, setOs] = useState<OS>('other');
  const [browser, setBrowser] = useState<'safari' | 'chrome' | 'other'>('other');
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');
  const [copied, setCopied] = useState(false);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const detectedOs = detectOS();
    setOs(detectedOs);
    setBrowser(detectBrowser());
    if (detectedOs === 'android') setActiveTab('android');
  }, []);

  const steps = activeTab === 'ios' ? IOS_STEPS : ANDROID_STEPS;

  function copyUrl() {
    navigator.clipboard.writeText(APP_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <ThemeInitializer />
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--surface-base)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 20, height: 20, background: 'var(--amber-core)', borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: 'var(--indigo-dark)',
              }}
            >
              K
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Crowe Keystone
            </span>
          </div>
          <ThemeToggle compact />
        </header>

        {/* Main content */}
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
          <motion.div
            variants={shouldReduce ? undefined : authPageVariants}
            initial={shouldReduce ? undefined : 'initial'}
            animate={shouldReduce ? undefined : 'animate'}
          >
            {/* Title */}
            <h1
              style={{
                fontSize: 28, fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: 8, fontFamily: 'var(--font-display)',
              }}
            >
              Install Keystone on your phone
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
              Scan to open · Add to home screen · Get notifications
            </p>

            {/* QR Code */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <motion.div
                variants={shouldReduce ? undefined : qrPulseVariants}
                animate={shouldReduce ? undefined : 'animate'}
                style={{
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                  padding: 20, borderRadius: 16, background: '#ffffff',
                  boxShadow: 'var(--shadow-lg)', gap: 12,
                }}
              >
                <QRCodeSVG
                  value={APP_URL}
                  size={200}
                  level="M"
                  fgColor="#011E41"
                  bgColor="#ffffff"
                  includeMargin={false}
                />
                <span
                  style={{
                    fontSize: 11, color: '#545968', fontFamily: 'var(--font-geist-mono)',
                    cursor: 'pointer',
                  }}
                  onClick={copyUrl}
                >
                  {copied ? 'Copied!' : APP_URL}
                </span>
              </motion.div>
            </div>

            {/* iOS Chrome warning */}
            {os === 'ios' && browser === 'chrome' && (
              <div
                style={{
                  background: 'var(--amber-glow)', border: '1px solid var(--border-amber)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 24,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <span style={{ color: 'var(--amber-core)', fontSize: 16 }}>!</span>
                <div>
                  <div style={{ color: 'var(--amber-core)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    You are using Chrome on iPhone
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    PWA install only works in Safari. Copy this URL and open it in Safari:
                  </div>
                  <button
                    onClick={copyUrl}
                    style={{
                      marginTop: 8, fontSize: 12, color: 'var(--amber-core)',
                      background: 'none', border: '1px solid var(--border-amber)',
                      borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    }}
                  >
                    {copied ? 'Copied!' : `${APP_URL}`}
                  </button>
                </div>
              </div>
            )}

            {/* OS tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {(['ios', 'android'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 10,
                    border: activeTab === tab ? '2px solid var(--amber-core)' : '1px solid var(--border-default)',
                    background: activeTab === tab ? 'var(--amber-glow)' : 'var(--surface-input)',
                    color: activeTab === tab ? 'var(--amber-core)' : 'var(--text-secondary)',
                    fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
                  }}
                >
                  {tab === 'ios' ? 'iPhone (Safari)' : 'Android (Chrome)'}
                </button>
              ))}
            </div>

            {/* Steps */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={shouldReduce ? undefined : listContainerVariants}
                initial={shouldReduce ? undefined : 'initial'}
                animate={shouldReduce ? undefined : 'animate'}
                style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}
              >
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    variants={shouldReduce ? undefined : installStepVariants}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '14px 16px', borderRadius: 10,
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--amber-glow)', border: '1px solid var(--border-amber)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: 'var(--amber-core)',
                        flexShrink: 0,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {step.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* After installing section */}
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 24, marginBottom: 32,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                After installing
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Allow push notifications to get:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {NOTIFICATION_TYPES.map((n) => (
                  <div
                    key={n.label}
                    style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4, color: 'var(--amber-core)' }}>
                      {n.icon}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {n.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {n.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop fallback */}
            {os === 'other' && (
              <div
                style={{
                  padding: '16px', borderRadius: 10,
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  marginTop: 8,
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Scan this QR code with your iPhone camera or Android device to install on mobile.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  On desktop, Keystone works best in your browser — no installation needed.
                </p>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </>
  );
}
