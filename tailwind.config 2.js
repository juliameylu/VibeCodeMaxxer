/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3FA36F",
        secondary: "#2A6E4A",
        accent: "#5BAE7E",
        calpoly: "#3FA36F",
        butter: "#EEF9EA",
        honey: "#BAE6C8",
        amberSoft: "#6CBF84",
        ink: "#173225",
      },
      boxShadow: {
        phone: "0 24px 60px rgba(23, 50, 37, 0.18)",
      },
    },
  },
  plugins: [],
};
