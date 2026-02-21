/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#00a651',      // Bright Cal Poly green
        secondary: '#1a3a52',    // Cal Poly blue/dark
        accent: '#2980b9',       // Accent blue
        calpoly: '#00a651',      // Main green
      },
    },
  },
  plugins: [],
};
