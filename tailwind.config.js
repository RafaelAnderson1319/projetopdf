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
          blue: '#1565C0',
          blueHover: '#0D47A1',
          teal: '#1FA38A',
          tealHover: '#17826E',
          yellow: '#FFC93C',
          yellowHover: '#F5B820',
          sky: '#EBF5FF',
          mint: '#E8F8F5',
          softBg: '#F8FCFD',
          cardBg: '#FFFFFF',
        }
      },
      fontFamily: {
        heading: ['Fredoka', 'cursive', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 10px 30px -5px rgba(21, 101, 192, 0.08), 0 4px 12px -2px rgba(21, 101, 192, 0.04)',
        'card': '0 12px 36px -6px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        'pill': '0 8px 24px -4px rgba(255, 201, 60, 0.4)',
        'pillGreen': '0 8px 24px -4px rgba(31, 163, 138, 0.4)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        }
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'float-delayed': 'float 4s ease-in-out 2s infinite',
        pulseSubtle: 'pulseSubtle 2.5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
