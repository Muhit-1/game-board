import type { Config } from 'tailwindcss';

/** Colours are stored as `R G B` channel triplets so Tailwind's opacity modifiers (bg-walnut/60, ring-brass/40…) work with CSS variables. */
const rgb = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

export default {
  content: ['./index.html', './catan/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'charred-oak': rgb('charred-oak'),
        walnut: rgb('walnut'),
        'walnut-2': rgb('walnut-2'),
        brass: rgb('brass'),
        'brass-soft': rgb('brass-soft'),
        parchment: rgb('parchment'),
        'parchment-dim': rgb('parchment-dim'),
        ember: rgb('ember'),
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Karla', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        pop: ['Fredoka', 'sans-serif'],
      },
      // One type scale for the whole UI (display sizes for headings are set per component).
      fontSize: {
        micro: '10.5px',
        label: '12px',
        small: '13px',
        body: '14px',
        md: '16px',
        lead: '17px',
      },
      letterSpacing: {
        caps: '0.07em',
        kicker: '0.12em',
      },
      // Tinted by the table colour (see tableThemeStyle), so shadows blend with every theme.
      boxShadow: {
        card: 'var(--shadow-card)',
        deep: 'var(--shadow-deep)',
      },
    },
  },
  plugins: [],
} satisfies Config;
