/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts}", // all HTML, JS, TS in src and subfolders
    "./src/index.html"         // explicitly include root index.html, TODO: check if is necessary
  ],
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
