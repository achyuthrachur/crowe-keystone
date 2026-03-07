import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Script from 'next/script';
import './globals.css';

// Plus Jakarta Sans is loaded via CSS variable fallback when Google Fonts
// is unavailable (e.g., behind a corporate proxy). The CSS variable
// --font-display falls back gracefully to Geist Sans in that case.

export const metadata: Metadata = {
  title: 'Crowe Keystone',
  description: 'AI-native operating system for AI building teams',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Keystone',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0a0f1a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Keystone" />
        <link rel="apple-touch-icon" href="/keystone-192.png" />
        <link rel="icon" href="/keystone-icon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                  .then(reg => console.log('[SW] registered', reg.scope))
                  .catch(err => console.warn('[SW] registration failed', err));
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
