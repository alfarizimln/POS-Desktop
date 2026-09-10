/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/**/*.{tsx,ts,html}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(17 24 39 / 0.04), 0 1px 3px 0 rgb(17 24 39 / 0.06)',
      },
    },
  },
  plugins: [],
}