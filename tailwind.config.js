/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
        'pulse-mic': 'pulse-mic 1.5s ease-in-out infinite',
      },
      keyframes: {
        'typing-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
        'pulse-mic': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
}
