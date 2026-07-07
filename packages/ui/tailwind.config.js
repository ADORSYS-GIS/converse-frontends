/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,tsx}', './.storybook/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset'), require('./tailwind-preset')],
  darkMode: 'class',
};
