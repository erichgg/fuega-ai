/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fuega: {
          orange: '#FF6B2C',
          navy: '#1A1A2E',
          teal: '#00D4AA',
          surface: '#0F0F1A',
          card: '#1C1C2E',
          'card-hover': '#252540',
          border: '#2A2A3E',
          'text-primary': '#FFFFFF',
          'text-secondary': '#A0A0B8',
          'text-muted': '#6B6B80',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
