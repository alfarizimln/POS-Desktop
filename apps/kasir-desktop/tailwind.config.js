/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/**/*.{tsx,ts,html}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#0f766e',
          hover: '#115e59',
          soft: '#ccfbf1',
          tint: '#f0fdfa',
        },
      },
    },
  },
  plugins: [],
}