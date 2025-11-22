/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trade-bg': '#0f0f14',
        'trade-surface': '#18181b',
        'trade-border': 'rgba(255, 255, 255, 0.08)',
        'up': '#26a69a',
        'down': '#ef5350',
      },
      gridTemplateColumns: {
        'trading': '280px 1fr 320px',
      }
    },
  },
  plugins: [],
}
