const expoPreset = require('jest-expo/jest-preset');

// jest-expo's transformIgnorePatterns allow-lists RN/expo packages so their raw
// source is transformed. `@uidotdev/usehooks` ships ESM and isn't on that list,
// so add it — without it, any module importing it fails to parse under Jest.
// The `d3-*` family (+ `internmap`, a `d3-array` dependency) that
// `@lightbridge/ui`'s chart primitives (ADR-0008) pull in via `d3-scale`/
// `d3-shape`/`d3-array` is the same problem: every one of those packages ships
// ESM-only in `node_modules`, and since `@lightbridge/ui`'s barrel
// (`src/index.ts`) re-exports the chart primitives, importing *anything* from
// `@lightbridge/ui` transitively requires them — this broke 32 of 44 test
// suites in this app before being added here, not just chart-specific tests.
// (Insert into the existing allow-list rather than replacing it, to stay robust
// against jest-expo updates.)
const [baseIgnorePattern, ...restIgnorePatterns] = expoPreset.transformIgnorePatterns;
const transformIgnorePatterns = [
  baseIgnorePattern.replace('(?!(', '(?!(@uidotdev|d3-|internmap|'),
  ...restIgnorePatterns,
];

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  transformIgnorePatterns,
};
