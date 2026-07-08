const expoPreset = require('jest-expo/jest-preset');

// jest-expo's transformIgnorePatterns allow-lists RN/expo packages so their raw
// source is transformed. `@uidotdev/usehooks` ships ESM and isn't on that list,
// so add it — without it, any module importing it fails to parse under Jest.
// (Insert into the existing allow-list rather than replacing it, to stay robust
// against jest-expo updates.)
const [baseIgnorePattern, ...restIgnorePatterns] = expoPreset.transformIgnorePatterns;
const transformIgnorePatterns = [
  baseIgnorePattern.replace('(?!(', '(?!(@uidotdev|'),
  ...restIgnorePatterns,
];

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  transformIgnorePatterns,
};
