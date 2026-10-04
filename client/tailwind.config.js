/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Young Serif"', "Georgia", "serif"],
        body: ['"Schibsted Grotesk"', "system-ui", "sans-serif"],
      },
      colors: {
        lichen: "#E3E9D6",
        chalk: "#F8F9F3",
        bark: "#25241C",
        plum: "#5B2A52",
        moss: "#9DAF84",
        sodium: "#F5C84B",
        gray:{
          100: "#eeeeef",
          200: "#e6e9ed",
          600: "#95989c",
        },
        purple: {
          200: "#d9ddee",
          500: "#9492db",
          600: "#7164c0",
        }
      }
    },
  },
  plugins: [],
}