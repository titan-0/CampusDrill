/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Typewriter face for exam-specific UI: timers, Q numbers, option letters
        mono: ['"Courier Prime"', '"Courier New"', 'Courier', 'monospace'],
      },
      colors: {
        // Warm off-white paper tones
        paper: {
          DEFAULT: '#F7F3EC',
          dark:    '#EDE8DB',
          border:  '#D5CBBA',
        },
        // Stamped red-pen red
        crimson: {
          50:  '#FEF2F2',
          100: '#FFE3E3',
          200: '#FFC9C9',
          500: '#DC2626',
          600: '#C41E3A',
          700: '#9B1C2E',
          800: '#7A1524',
        },
        // Graphite / warm dark
        graphite: {
          50:  '#F8F7F5',
          100: '#EFEDE8',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0D1117',
        },
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
