import { getThemeColors } from '../theme/theme-colors';
import { useEffectiveColorScheme } from '../theme/theme-preference';

export function useThemeColors() {
  // Resolve from the *effective* scheme (user preference → system), so inline
  // colors honour the theme toggle and stay in sync with the className tokens.
  const scheme = useEffectiveColorScheme();
  return getThemeColors(scheme);
}
