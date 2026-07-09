import React from 'react';
import { SheetProvider } from '@lightbridge/ui/sheet';

import { useThemeColors } from '../hooks/use-theme-colors';

/**
 * App-shell wrapper around the design-system {@link SheetProvider} that feeds it
 * the active theme's surface + handle colours, so imperative sheets match the
 * light/dark palette instead of gorhom's default white. Mount once at the root,
 * inside `ThemePreferenceProvider` (for the colours) and the data providers the
 * sheet content relies on (i18n, query, router).
 */
export function AppSheetProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const colors = useThemeColors();

  return (
    <SheetProvider backgroundColor={colors.surface} handleIndicatorColor={colors.subtle}>
      {children}
    </SheetProvider>
  );
}
