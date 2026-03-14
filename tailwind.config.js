/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#0a0a0a',
          dark: '#111111',
          card: '#161616',
          hover: '#1e1e1e',
        },
        purple: {
          dark: '#1a0a2e',
          mid: '#2d1554',
          light: '#6b21a8',
        },
        blood: {
          dark: '#5c0000',
          DEFAULT: '#8b0000',
          light: '#b91c1c',
        },
        neon: {
          green: '#00ff88',
          blue: '#00d4ff',
          yellow: '#ffd700',
        },
        muted: '#4a4a5a',
      },
      fontFamily: {
        pixel: ['"VT323"', 'monospace'],
        mono: ['"Courier Prime"', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'flash': 'flash 0.5s ease-out',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 4px #00ff88, 0 0 8px #00ff88' },
          '50%': { boxShadow: '0 0 12px #00ff88, 0 0 24px #00ff88' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'flash': {
          '0%': { backgroundColor: 'rgba(0,255,136,0.15)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}
