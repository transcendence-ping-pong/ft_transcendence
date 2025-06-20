/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/index.html", "./src/**/*.{js,ts,jsx,tsx}"], // HTML, all JS, TS in src and subfolders
  theme: {
    extend: {
      colors: {
        primary: "#ff0000",
        secondary: "",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
