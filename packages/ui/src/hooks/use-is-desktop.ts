import { useWindowDimensions } from 'react-native';

import { designTokens } from '../design/tokens';

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return width >= designTokens.breakpoint.desktop;
}
