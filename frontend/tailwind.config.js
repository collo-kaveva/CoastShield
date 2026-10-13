/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ocean: { 50: "#EEF4F9", 100: "#D9E6F1", 200: "#B5CDE3", 300: "#86A9C8", 400: "#5C86AB", 500: "#44688C", 600: "#355574", 700: "#274260", 800: "#17304F", 900: "#0B2545" },
        lagoon: { 50: "#E8FBF9", 100: "#C5F4EF", 200: "#8DE6DC", 300: "#55D4C7", 400: "#2CC0B2", 500: "#1BA79A", 600: "#0E8A7F", 700: "#0B766D", 800: "#095E57", 900: "#074A45" },
        sand: { 50: "#FBF8F3", 100: "#F5EFE4", 200: "#EADFCB", 300: "#DCCBAB", 400: "#C7AE82" },
        coral: { 50: "#FEF0EB", 100: "#FCDCD0", 500: "#E4572E", 600: "#C9421C", 700: "#A53517" },
        sun: { 50: "#FFF7E6", 100: "#FDE9B8", 500: "#F2A33A", 700: "#8A5A0B" },
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', "Palatino", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,37,69,.06), 0 4px 16px rgba(11,37,69,.06)",
        lift: "0 10px 30px rgba(11,37,69,.15)",
      },
    },
  },
  plugins: [],
};
