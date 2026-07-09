import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { SegmentedControl, Stack, Text } from '@lightbridge/ui';

import { useThemePreference, type ThemePreference } from '../theme/theme-preference';

/**
 * Appearance control — lets the user pick Light / Dark / System, overriding the
 * OS default. Persists via the ThemePreference context (localStorage-backed).
 */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { preference, setPreference } = useThemePreference();

  const options = [
    { key: 'system', label: t('settings.appearance.system', { defaultValue: 'System' }) },
    { key: 'light', label: t('settings.appearance.light', { defaultValue: 'Light' }) },
    { key: 'dark', label: t('settings.appearance.dark', { defaultValue: 'Dark' }) },
  ];

  return (
    <Stack gap="sm" width="full">
      <Text intent="eyebrow">{t('settings.appearance.title', { defaultValue: 'Appearance' })}</Text>
      <SegmentedControl
        width="full"
        options={options}
        value={preference}
        onChange={(key) => setPreference(key as ThemePreference)}
      />
    </Stack>
  );
}
