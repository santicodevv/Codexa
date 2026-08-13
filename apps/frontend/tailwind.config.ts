import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7f265b',
          dark: '#73114b',
          hover: '#6a1f4d',
        },
        peach: '#ffe6c9',
      },
    },
  },
  plugins: [],
} satisfies Config
