import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05060b',
          900: '#0a0c14',
          800: '#11141f',
          700: '#1a1e2e',
          600: '#252a3d',
        },
        aurora: {
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          magenta: '#e879f9',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgb(139 92 246 / 0.55)',
        'glow-lg': '0 0 90px -12px rgb(139 92 246 / 0.65)',
        'glow-cyan': '0 0 40px -8px rgb(34 211 238 / 0.5)',
        lift: '0 24px 70px -20px rgb(0 0 0 / 0.75)',
        'inner-hairline': 'inset 0 1px 0 0 rgb(255 255 255 / 0.07)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to right, rgb(255 255 255 / 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.045) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '56px 56px',
      },
      animation: {
        'spin-slow': 'spin 22s linear infinite',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
