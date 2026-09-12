import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './catan/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'charred-oak': 'var(--charred-oak)',
        walnut: 'var(--walnut)',
        'walnut-2': 'var(--walnut-2)',
        brass: 'var(--brass)',
        'brass-soft': 'var(--brass-soft)',
        parchment: 'var(--parchment)',
        'parchment-dim': 'var(--parchment-dim)',
        ember: 'var(--ember)',
        moss: 'var(--moss)',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Karla', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        deep: '0 24px 60px rgba(0,0,0,.55)',
      },
    },
  },
  plugins: [],
} satisfies Config;
