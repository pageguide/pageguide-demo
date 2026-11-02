import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // PageGuide brand palette (carried over from the original demo + the 🍊 mark)
        orange: {
          DEFAULT: '#f0792b',
          soft: '#fbebdf',
          ring: '#f2dac9',
        },
        sage: {
          DEFAULT: '#7d8f68',
          soft: '#e8eee4',
        },
        cream: '#faf9f6',
        ink: '#292e2a',
        muted: '#777b72',
        line: '#e3e3da',
        // dark surface
        night: {
          DEFAULT: '#1b1e1a',
          panel: '#23271f',
          line: '#343a30',
          ink: '#e9ebe4',
          muted: '#9aa08c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 60px rgba(48, 56, 39, 0.10)',
        soft: '0 2px 10px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
