/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          dark: '#0f172a',
          mid: '#1e293b',
          light: '#334155'
        },
        safe: '#10b981',
        warn: '#f59e0b',
        danger: '#ef4444'
      }
    },
  },
  plugins: [],
}
