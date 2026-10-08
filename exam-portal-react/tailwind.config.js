/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6c5ce7',
          hover: '#5843e4',
          light: '#a29bfe',
        },
        success: '#00b894',
        warning: '#fdcb6e',
        danger: '#d63031',
      },
      fontFamily: {
        bangla: ['"Hind Siliguri"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
