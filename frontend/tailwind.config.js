/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/index.html", "./src/**/*.{js,ts,jsx,tsx}"], // HTML, all JS, TS in src and subfolders
  theme: {
    extend: {
      colors: {},
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        wired: ['WiredMono', 'helvetica', 'sans-serif'], // custom WiredMono font
      },
    },
  },
  plugins: [],
}
