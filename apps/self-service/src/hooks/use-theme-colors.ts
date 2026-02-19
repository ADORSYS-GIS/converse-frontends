import { useColorScheme } from 'react-native';

import { getThemeColors } from '../theme/theme-colors';

export function useThemeColors() {
  const scheme = useColorScheme();
  return getThemeColors(scheme);
}
