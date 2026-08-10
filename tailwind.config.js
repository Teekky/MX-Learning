/** @type {import('tailwindcss').Config} */

/**
 * Tailwind mirrors src/tokens.css 1:1 — every value below is a `var()`
 * pointing at a token. Nothing here invents a number. If you need a new
 * radius / duration / colour, add the token first, then expose it here.
 *
 * Consequence worth knowing: the standard scale keys are remapped, so
 * `rounded-lg` is 20px (not Tailwind's 8px) and `text-lg` is 20px. Existing
 * markup therefore picks up the new design language without being rewritten.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Manual class-based dark mode: the `dark` class on <html> is added by
  // src/main.tsx on early load and kept in sync with settings.theme by App.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--color-bg) / <alpha-value>)',
          elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
          subtle: 'rgb(var(--color-bg-subtle) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          subtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
        },
        /* The deliberate brutalist stroke colour. Named `stroke` rather than
           `ink` so that `border-stroke` (colour) can coexist with
           `border-ink` (the 2px width below) — same class name otherwise. */
        stroke: 'rgb(var(--color-ink-line) / <alpha-value>)',
        text: {
          DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-text-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          /* Muted accent surface — used as a tinted background. */
          subtle: 'rgb(var(--color-accent) / 0.12)',
        },
        'on-accent': 'rgb(var(--color-on-accent) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        /* Alias kept for onboarding markup that says `error`. */
        error: 'rgb(var(--color-danger) / <alpha-value>)',
        grade: {
          again: 'rgb(var(--color-grade-again) / <alpha-value>)',
          hard: 'rgb(var(--color-grade-hard) / <alpha-value>)',
          good: 'rgb(var(--color-grade-good) / <alpha-value>)',
          easy: 'rgb(var(--color-grade-easy) / <alpha-value>)',
        },
      },

      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },

      fontSize: {
        '2xs': ['var(--text-2xs)', { lineHeight: '1.3' }],
        xs: ['var(--text-xs)', { lineHeight: '1.4' }],
        sm: ['var(--text-sm)', { lineHeight: '1.5' }],
        base: ['var(--text-base)', { lineHeight: '1.6' }],
        lg: ['var(--text-lg)', { lineHeight: '1.4' }],
        xl: ['var(--text-xl)', { lineHeight: '1.3' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.2' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.12' }],
        '4xl': ['var(--text-4xl)', { lineHeight: '1.05' }],
        '5xl': ['var(--text-5xl)', { lineHeight: '1' }],
      },

      letterSpacing: {
        tight: 'var(--tracking-tight)',
        display: 'var(--tracking-display)',
        wider: 'var(--tracking-wide)',
      },

      borderRadius: {
        DEFAULT: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-pill)',
      },

      borderWidth: {
        hair: 'var(--border-hair)',
        ink: 'var(--border-ink)',
      },

      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-xl)',
        float: 'var(--shadow-float)',
        none: 'var(--shadow-none)',
      },

      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        /* Device insets, usable as p-safe-b, mb-safe-b, h-nav… */
        'safe-t': 'var(--safe-top)',
        'safe-b': 'var(--safe-bottom)',
        'safe-l': 'var(--safe-left)',
        'safe-r': 'var(--safe-right)',
        gutter: 'var(--edge-gutter)',
        tap: 'var(--tap-min)',
        nav: 'var(--bottom-nav-h)',
      },

      minHeight: { tap: 'var(--tap-min)' },
      minWidth: { tap: 'var(--tap-min)' },

      transitionDuration: {
        instant: 'var(--dur-instant)',
        fast: 'var(--dur-fast)',
        DEFAULT: 'var(--dur-base)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
        reveal: 'var(--dur-reveal)',
      },

      transitionTimingFunction: {
        DEFAULT: 'var(--ease-out)',
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        spring: 'var(--ease-spring)',
      },

      /* Keyframe animations stay on transform/opacity only, so they run on
         the compositor and hold 120 Hz on the S22 Ultra's display. */
      animation: {
        'fade-in': 'fadeIn var(--dur-base) var(--ease-out)',
        'slide-up': 'slideUp var(--dur-slow) var(--ease-out)',
        pop: 'pop var(--dur-fast) var(--ease-spring)',
        'pulse-ring': 'pulseRing 1.6s var(--ease-in-out) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translate3d(0, 10px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseRing: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.06)' },
        },
      },
    },
  },
  plugins: [],
}
