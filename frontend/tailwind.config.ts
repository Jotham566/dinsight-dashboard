import type { Config } from 'tailwindcss';

/**
 * Tailwind config — bound to the semantic token layer in src/app/globals.css.
 *
 * Component code should prefer the semantic utilities (`bg-surface`,
 * `text-fg-muted`, `border-strong`, `bg-accent`, `bg-success-bg`, ...) over
 * raw Tailwind families like `gray-500`/`blue-600`. The raw families are
 * retained as a backward-compat shim during the migration in design-system.md §17
 * and will be removed once every call site uses the semantic API.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ---------- Semantic tokens (the public design API) ---------- */
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          muted: 'var(--color-surface-muted)',
          hover: 'var(--color-surface-hover)',
          selected: 'var(--color-surface-selected)',
          disabled: 'var(--color-surface-disabled)',
        },
        // `border-DEFAULT` / `border-strong` / `border-disabled`
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
          disabled: 'var(--color-disabled-border)',
        },
        // Foreground text scale — use `text-fg`, `text-fg-muted`, etc.
        fg: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
          disabled: 'var(--color-disabled-text)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          contrast: 'var(--color-accent-contrast)',
        },
        focus: 'var(--color-focus)',
        scrim: 'var(--color-overlay-scrim)',
        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
          border: 'var(--color-success-border)',
          text: 'var(--color-success-text)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
          border: 'var(--color-warning-border)',
          text: 'var(--color-warning-text)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          bg: 'var(--color-danger-bg)',
          border: 'var(--color-danger-border)',
          text: 'var(--color-danger-text)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          bg: 'var(--color-info-bg)',
          border: 'var(--color-info-border)',
          text: 'var(--color-info-text)',
        },
        control: {
          bg: 'var(--color-control-bg)',
          'bg-hover': 'var(--color-control-bg-hover)',
          'bg-disabled': 'var(--color-control-bg-disabled)',
          border: 'var(--color-control-border)',
          'border-hover': 'var(--color-control-border-hover)',
          'border-focus': 'var(--color-control-border-focus)',
          'border-disabled': 'var(--color-control-border-disabled)',
        },
        chart: {
          grid: 'var(--color-chart-grid)',
          axis: 'var(--color-chart-axis)',
          'neutral-line': 'var(--color-chart-neutral-line)',
          threshold: 'var(--color-chart-threshold)',
        },

        /* ---------- Legacy palettes (codemod target, do not extend) ----------
         * These exist only because ~180 call sites still reference them.
         * Phase C5 of the migration replaces every use with semantic tokens. */
        primary: {
          50: '#f5f9ff',
          100: '#e0ebff',
          200: '#c1d7ff',
          300: '#9bbbff',
          400: '#5e8efb',
          500: '#155eef',
          600: '#155eef',
          700: '#0942af',
          800: '#093689',
          900: '#0a2d6c',
          950: '#06183d',
        },
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      // design-system.md §8.1 — IBM Plex Sans for UI, IBM Plex Mono for technical
      // values. The CSS variables are injected by next/font in app/layout.tsx.
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
        '128': '32rem',
        '144': '36rem',
      },
      // Radius capped at 12px per design-system.md §9.2. Pill ('full') stays for badges.
      borderRadius: {
        none: '0',
        sm: '0.375rem', // 6px
        DEFAULT: '0.5rem', // 8px
        md: '0.5rem', // 8px
        lg: '0.75rem', // 12px
        full: '9999px',
      },
      // Forbidden decorative animations stripped per design-system.md §10.3.
      // Only functional motion remains.
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'fade-up': 'fadeUp 0.18s ease-out',
        'slide-in': 'slideIn 0.18s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-6px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
