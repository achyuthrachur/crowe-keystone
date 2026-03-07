import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Consolas', 'monospace'],
        display: ['var(--font-display)', 'var(--font-geist-sans)', 'system-ui'],
      },
      colors: {
        crowe: {
          amber: '#F5A800',
          'amber-dk': '#D7761D',
          'amber-bright': '#FFD231',
          teal: '#05AB8C',
          violet: '#B14FC5',
          blue: '#0075C9',
          coral: '#E5376B',
          orange: '#F97316',
          indigo: '#002E62',
          'indigo-dark': '#011E41',
        },
        surface: {
          base: 'var(--surface-base)',
          elevated: 'var(--surface-elevated)',
          overlay: 'var(--surface-overlay)',
          input: 'var(--surface-input)',
          hover: 'var(--surface-hover)',
          selected: 'var(--surface-selected)',
        },
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        amber: 'var(--shadow-amber)',
        teal: 'var(--shadow-teal)',
        coral: 'var(--shadow-coral)',
      },
    },
  },
  plugins: [],
};

export default config;
