'use client';

import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
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
 * ## It is a DROPDOWN, not a segmented strip (owner directive, 2026-09-03)
 *
 * "Language selection should be a dropdown." This shipped as a `SegmentedControl` on the theory
 * that two options fit a strip exactly and a dropdown to choose between two things is a click
 * nobody needs. The owner's read is the one that governs, and it is also the one that scales: the
 * strip's width is the SUM of every language's endonym, so it is a control that gets wider — and
 * eventually wraps, or truncates the labels a reader is depending on — with every locale added.
 * A `SelectField` is the same width at two languages as at twelve.
 *
 * `SelectField` is the console's ONE single-value dropdown (ADR 0010 D2, unify-select #368) — a
 * Base UI `Select`, never a native `<select>` and never a second hand-rolled `Select.Root` tree
 * at a call site. `layout="inline"` is what makes the trigger size to its own content
 * (`theme.css`'s `.label > button.input { width: auto }`) so it sits in a footer row's trailing
 * slot rather than filling it; `hideLabel` keeps `t('language.label')` as the trigger's real
 * accessible name while the row it lives in renders the visible label — without it the control
 * would read "Language Language" in the accessibility tree at both mounts.
 *
 * The option labels are ENDONYMS — "English", "Deutsch" — and therefore identical in both bundles.
 * That is deliberate: a reader who has landed in a language they cannot read needs to recognise
 * their own language's name in the control, which "German"/"Englisch" would not give them.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLocaleSwitcher();

  return (
    <SelectField
      label={t('language.label')}
      hideLabel
      layout="inline"
      options={LOCALES.map((value) => ({ value, label: t(`language.${value}`) }))}
      value={locale}
      onChange={(next) => setLocale(next as Locale)}
      className={className}
    />
  );
}
