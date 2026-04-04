import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#05070f',
        panel: '#0b1220',
        panelMuted: '#0f172a',
        border: '#1f2a44',
        accent: '#7c8cff',
        accentAlt: '#38bdf8',
        text: '#e2e8f0',
        textMuted: '#94a3b8'
      },
      boxShadow: {
        card: '0 10px 40px rgba(0,0,0,0.25)'
      }
    }
  },
  plugins: []
};

export default config;
