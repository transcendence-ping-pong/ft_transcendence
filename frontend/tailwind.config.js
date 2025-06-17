/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/index.html", "./src/**/*.{js,ts,jsx,tsx}"], // HTML, all JS, TS in src and subfolders
  theme: {
    extend: {
      colors: {
        primary: '#1DA1F2', // TODO STYLE: check primary, secondary, accent colors
        secondary: '#14171A',
        accent: '#657786',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
