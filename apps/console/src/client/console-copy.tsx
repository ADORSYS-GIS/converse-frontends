'use client';

import { CopyProvider, type UiCopy } from '@lightbridge/ui-web/src/lib/copy';
import { useMemo, type ReactNode } from 'react';

import { useConsoleLocale, useTranslation } from '../i18n/client';

/**
 * The one bridge between the console's i18next bundle and `packages/ui-web`'s copy contract
 * (ADR 0017).
 *
 * `ui-web` owns no translations and never calls `t()` — a component library that carried its own
 * resource bundle would need every consumer to keep that bundle in sync with its own, and the first
 * divergence would be a screen half in each language. What it exposes instead is `UiCopy`: a small,
 * closed set of strings baked into PRIMITIVES rather than passed as props ("Retry", the pagination
 * captions, "Expand …"), each with an English default. This component fills that set from the
 * console's own `common` namespace, once, at the app root.
 *
 * It also carries the money locale, which is what makes a German session read `1.131,80 $` where an
 * English one reads `$1 131.80` — see `packages/ui-web/src/lib/money.ts` for why that one value is
 * ambient rather than a prop, and why it is sound here.
 *
 * The placeholder syntax is `{{name}}` in both systems, and the templates cross the boundary
 * UNINTERPOLATED — `ui-web` substitutes them itself, with its own three-line `fillCopy`, because it
 * has no i18next to do it. That is why these five captions are read with `i18n.getResource` rather
 * than `t()`: `t('pagination.showing-of-total')` would run i18next's interpolator over a string
 * whose variables are deliberately absent at this point, which is a warning at best and a blanked
 * placeholder at worst. `getResource` returns the stored template verbatim, which is exactly what
 * the contract wants to hand over.
 */
export function ConsoleCopyProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation('common');
  const locale = useConsoleLocale();

  /** The stored template, uninterpolated. Falls back to `ui-web`'s own English default (by
   *  returning `undefined`, which `CopyProvider` merges over) rather than to the key. */
  const template = (key: string): string | undefined => {
    const value = i18n.getResource(locale, 'common', key);
    return typeof value === 'string' ? value : undefined;
  };

  const copy = useMemo<Partial<UiCopy>>(
    () => ({
      locale,
      retry: t('actions.retry'),
      of: t('money.of'),
      paginationShowingOfTotal: template('pagination.showing-of-total'),
      paginationPerPage: template('pagination.per-page'),
      paginationCount: template('pagination.count'),
      paginationPrevious: t('pagination.previous'),
      paginationNext: t('pagination.next'),
      expandPanel: template('actions.expand-panel'),
      close: t('actions.close'),
    }),
    // `template` is a stable closure over `i18n`/`locale`, both of which are already dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n, locale]
  );

  return <CopyProvider copy={copy}>{children}</CopyProvider>;
}
