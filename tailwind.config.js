/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#F5C518',
          'yellow-dark': '#D4A800',
          'yellow-light': '#FFF3B0',
          black: '#0A0A0A',
          'black-soft': '#1A1A1A',
          'gray-dark': '#2A2A2A',
          'gray-mid': '#3D3D3D',
          'gray-light': '#6B6B6B',
          'gray-border': '#E5E5E5',
          white: '#FFFFFF',
          'white-off': '#F9F9F9',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
