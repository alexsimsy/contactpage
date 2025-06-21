/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        'brand-blue': '#3B82F6',
        'brand-blue-dark': '#1E3A8A',
        'brand-purple': '#581C87',
        // Background colors
        'navy': '#181F2A',
        'black': '#000000',
        // Text colors
        'text-primary': '#FFFFFF',
        'text-secondary': '#D1D5DB',
        'text-accent': '#3B82F6',
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(to bottom, var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(to bottom, #1E3A8A, #581C87, #1E3A8A)',
      },
    },
  },
  plugins: [],
} 