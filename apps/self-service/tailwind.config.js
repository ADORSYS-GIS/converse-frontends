/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,tsx}',
    '../../packages/ui/src/**/*.{js,ts,tsx}',
  ],

  presets: [require('nativewind/preset'), require('@lightbridge/ui/tailwind-preset')],
  darkMode: 'class',
};
