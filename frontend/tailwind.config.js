// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- required for the .dark strategy we used
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx,html}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        accent: ['"Space Grotesk"', 'sans-serif'],
      },
      keyframes: {
        'marquee-rtl': {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(-50%,0,0)' },
        },
        'marquee-ltr': {
          '0%': { transform: 'translate3d(-50%,0,0)' },
          '100%': { transform: 'translate3d(0,0,0)' },
        },
      },
      animation: {
        // uses a CSS var so you can control speed with --marquee-duration
        'marquee-rtl': 'marquee-rtl var(--marquee-duration,40s) linear infinite',
        'marquee-ltr': 'marquee-ltr var(--marquee-duration,40s) linear infinite',
      },
    },
  },
  plugins: [],
};
