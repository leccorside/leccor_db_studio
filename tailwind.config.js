/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        sidebar: '#121214',
        panel: '#18181b',
        accent: '#6366f1',
        border: '#27272a',
      }
    },
  },
  plugins: [],
}
