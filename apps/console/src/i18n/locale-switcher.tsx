'use client';

import { SegmentedControl } from '@lightbridge/ui-web/src/components/segmented-control';
import React from 'react';

import { useTranslation } from './client';
import { LOCALES, type Locale } from './config';
import { useLocaleSwitcher } from './use-locale-switcher';

/**
 * The language control (ADR 0017). Two mounts, both of them a row in an existing list rather than a
 * surface of their own:
 *
 *  - the sidebar footer, directly under Theme (`client/console-chrome.tsx`) — the owner's own
 *    2026-08-31 ruling on the theme control applies verbatim to this one: a preference buried
 *    behind a trigger is undiscoverable, so it sits out in the rail;
 *  - `/settings/info`'s "Client state" card, beside the theme and connectivity readings, which is
 *    where a reader goes to see what this browser currently thinks.
 *
 * It composes `SegmentedControl` rather than introducing a fourth one-of-N treatment — the same
 * primitive `/admin/usage`'s actor lens uses. Two options fit the strip exactly; a `SelectField`
 * would be a dropdown to choose between two things.
 *
 * The option labels are ENDONYMS — "English", "Deutsch" — and therefore identical in both bundles.
 * That is deliberate: a reader who has landed in a language they cannot read needs to recognise
 * their own language's name in the control, which "German"/"Englisch" would not give them.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLocaleSwitcher();

  return (
    <SegmentedControl<Locale>
      aria-label={t('language.switch')}
      options={LOCALES.map((value) => ({ value, label: t(`language.${value}`) }))}
      value={locale}
      onChange={setLocale}
      className={className}
    />
  );
}
