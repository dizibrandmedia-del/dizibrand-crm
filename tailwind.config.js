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
        stitch: {
          base: '#0B0E14',
          shell: '#10131A',
          card: '#151A25',
          elevated: '#1A2232',
          hairline: '#232D42',
          borderElevated: '#334155',
          primary: '#3B5BFF',
          violet: '#8B5CF6',
          cyan: '#06D0C6',
        },
        status: {
          won: '#10B981',
          qualified: '#3B82F6',
          new: '#8B5CF6',
          risk: '#F43F5E',
          review: '#F59E0B',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#080d1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sora: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
