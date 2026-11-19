/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: '#163e72ff',
        'charcoal-light': '#243650',
        gold: '#3564ce',
        'gold-light': '#dbe8ff',
        'gold-dark': '#214cae',
        cream: '#f3f6fa',
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
