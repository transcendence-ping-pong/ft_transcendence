/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts}", // all HTML, JS, TS in src and subfolders
    "./src/index.html"         // explicitly include root index.html, TODO: check if is necessary
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

