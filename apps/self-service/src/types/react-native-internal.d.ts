// RN doesn't ship types for this internal module path. Tests mock it directly
// (rather than the whole 'react-native' package) to simulate scheme changes
// without breaking RN's lazily-loaded internals — see
// src/hooks/__tests__/use-theme-colors.test.ts.
declare module 'react-native/Libraries/Utilities/useColorScheme' {
  import type { ColorSchemeName } from 'react-native';

  export default function useColorScheme(): ColorSchemeName;
}
