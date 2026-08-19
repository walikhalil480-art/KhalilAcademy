/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1A365D',
          navyDark: '#0A1322',
          navySurface: '#0E1D33',
          navyCard: '#132742',
          navyElevated: '#1A365D',
          navyBorder: '#23426A',
          turquoise: '#4FD1C5',
          turquoiseHover: '#38B2AC',
          turquoiseDark: '#2C7A7B',
          turquoiseLight: '#81E6D9',
        },
        navy: {
          main: '#0A1322',
          secondary: '#0E1D33',
          surface: '#132742',
          elevated: '#1A365D',
          border: '#23426A',
        },
        accent: {
          turquoise: '#4FD1C5',
          turquoiseHover: '#38B2AC',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
        },
        slateText: {
          main: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
