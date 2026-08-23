// RN doesn't ship types for this internal module path. Tests mock it directly
// (rather than the whole 'react-native' package) to simulate scheme changes
// without breaking RN's lazily-loaded internals — see
// src/hooks/__tests__/use-theme-colors.test.ts.
declare module 'react-native/Libraries/Utilities/useColorScheme' {
  import type { ColorSchemeName } from 'react-native';

  export default function useColorScheme(): ColorSchemeName;
}

// Same rationale as useColorScheme above — mocked directly in tests exercising the ADR 0008
// breakpoint ladder (`useShellTier`, `packages/ui/src/hooks/use-shell-tier.ts`) so window-width
// changes can be simulated without RN's lazily-loaded Dimensions internals. See
// src/navigation/__tests__/use-shell-tier.test.ts / responsive-tab-bar.test.tsx.
declare module 'react-native/Libraries/Utilities/useWindowDimensions' {
  import type { ScaledSize } from 'react-native';

  export default function useWindowDimensions(): ScaledSize;
}
