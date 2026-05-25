import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1117',
        surface: '#1a1d27',
        surfaceHover: '#22253a',
        border: '#2d3148',
        primary: '#7c6af7',
        primaryHover: '#6d5ce6',
        text: '#e2e8f0',
        textMuted: '#94a3b8',
        textDim: '#64748b',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
      },
    },
  },
  plugins: [],
};

export default config;
