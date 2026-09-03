/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode design tokens
        brand: {
          // Light surfaces
          pageBg: '#F1F5F7',
          cardBg: '#FFFFFF',
          navyPrimary: '#0B1F3A',
          navyText: '#102A43',
          secondaryText: '#60758A',
          border: '#D9E3E8',
          // Dark surfaces
          darkPage: '#07182D',
          darkSecondary: '#0B223D',
          darkCard: '#102A43',
          darkElevated: '#152F4A',
          darkBorder: '#1E3A56',
          darkText: '#F8FAFC',
          darkMuted: '#A9BACB',
          // Teal palette
          teal: '#087F78',
          tealHover: '#076E6A',
          tealAccent: '#14B8A6',
          tealLight: '#CCFBF1',
        },
        accent: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
