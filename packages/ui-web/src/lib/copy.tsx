// `createContext` is a client-only API, so this module carries the directive rather than every
// primitive that reads it — `ErrorLine`, `Pagination`, `DashboardPanel` and `BottomSheet` are all
// interactive anyway, and several of them are rendered from Server Components (the console's
// `loading.tsx` boundaries). The alternative — a bare context module with no directive — fails the
// real Turbopack build with "You're importing a module that depends on `createContext` into a
// React Server Component module", which is how this line got here. `theme.ts` carries the same
// directive for the same reason; Storybook and Vitest ignore it.
'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';

import { setMoneyLocale, type MoneyLocale } from './money';

/**
 * The **ui-web copy contract** (ADR 0017 — i18n).
 *
 * `packages/ui-web` is a framework-agnostic component library: Storybook renders it with no app
 * around it, and `apps/lci`/`apps/authz-ui` consume it without an i18n runtime. So this package
 * **never owns an i18next instance and never calls `t()`**. Two mechanisms carry copy instead, and
 * only two:
 *
 *  1. **Props.** Anything a screen decides — a heading, an empty-state line, a column label — is a
 *     prop the consumer passes. That is already how nearly every section here works, and nothing
 *     about i18n changes it: `apps/console` simply passes `t('…')` where it used to pass a literal.
 *  2. **This context**, for the handful of strings baked into a PRIMITIVE's own behaviour, where a
 *     prop would have to be threaded through every intermediate section to reach the one component
 *     that renders it — `Pagination`'s "Showing 12 of 23 keys", `ErrorLine`'s "Retry",
 *     `DashboardPanel`'s "Expand …" label. Every one of them has an **English default**, so a
 *     consumer that mounts no provider (Storybook, `apps/lci`) renders exactly what it rendered
 *     before this contract existed.
 *
 * There is deliberately no third path. In particular there is no "ui-web looks up its own
 * translations": a component library that owned a resource bundle would need the app to keep that
 * bundle in sync with its own, and the first divergence would be a screen half in each language.
 *
 * The provider also sets the ambient money locale (`setMoneyLocale`), because currency NOTATION is
 * the one piece of formatting no prop can reasonably carry — `formatUsd` is called from 100+ call
 * sites, most of them deep inside chart tick formatters. See `money.ts` for why an ambient default
 * is sound there and where it is not.
 */

export interface UiCopy {
  /** The locale's money notation — `$1 131.80` vs `1.131,80 $`. See `money.ts`. */
  locale: MoneyLocale;

  /** `ErrorLine`'s retry affordance, when the caller passes no `retryLabel`. */
  retry: string;

  /** `formatUsdOf`'s joining word: "$0.0063 **of** $12.00". */
  of: string;

  /** `Pagination`'s three captions. `{{shown}}`/`{{total}}`/`{{pageSize}}`/`{{unit}}` are
   *  substituted positionally by `formatPaginationCaption` — this context carries no i18next, so
   *  the placeholders are replaced by a plain string swap rather than by an interpolator. */
  paginationShowingOfTotal: string;
  paginationPerPage: string;
  paginationCount: string;
  paginationPrevious: string;
  paginationNext: string;

  /** `DashboardPanel`'s zoom affordance — an `aria-label` built around the panel's own title. */
  expandPanel: string;
  /** `BottomSheet`'s close affordance. */
  close: string;
}

/**
 * English, and the source of truth for every key. A `de` bundle exists only in
 * `apps/console/locales/de/*.json`; this package ships no translations of its own, by design.
 */
export const DEFAULT_UI_COPY: UiCopy = {
  locale: 'en',
  retry: 'Retry',
  of: 'of',
  paginationShowingOfTotal: 'Showing {{shown}} of {{total}} {{unit}}',
  paginationPerPage: '{{shown}} of {{pageSize}} {{unit}} per page',
  paginationCount: '{{shown}} {{unit}}',
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
  expandPanel: 'Expand {{title}}',
  close: 'Close',
};

const CopyContext = createContext<UiCopy>(DEFAULT_UI_COPY);

export function useCopy(): UiCopy {
  return useContext(CopyContext);
}

/**
 * Overrides some or all of the defaults for the subtree. `apps/console` mounts exactly one, seeded
 * from its own i18next bundle; everything else mounts none and gets English.
 *
 * A PARTIAL override is merged over the defaults rather than replacing them, so a consumer that
 * only cares about, say, the retry label cannot accidentally blank the pagination captions.
 */
export function CopyProvider({ copy, children }: { copy: Partial<UiCopy>; children: ReactNode }) {
  // An EXPLICIT `undefined` in `copy` must fall back to the default, not blank the string — a
  // consumer that looks a key up and finds nothing passes `undefined`, and a plain spread would
  // happily overwrite "Retry" with it.
  const value = useMemo(() => {
    const merged: UiCopy = { ...DEFAULT_UI_COPY };
    for (const [key, entry] of Object.entries(copy)) {
      if (entry !== undefined) (merged as unknown as Record<string, unknown>)[key] = entry;
    }
    return merged;
  }, [copy]);
  // Set eagerly during render rather than in an effect: `formatUsd` is called by children on this
  // very pass, and a locale applied one commit later would paint the first frame in the wrong
  // notation. Assigning a module-level default is not a React state write, so this is safe to do
  // during render — see `money.ts`'s own note on why an ambient locale is sound in this codebase.
  setMoneyLocale(value.locale);
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

/** `'Expand {{title}}'` + `{ title: 'Spend by account' }` -> `'Expand Spend by account'`.
 *
 *  A deliberate three-line substitution rather than an i18next dependency: this package must build
 *  and render with no i18n runtime present (see the module doc comment), and the placeholder set is
 *  closed and tiny. Unknown placeholders are left verbatim, which makes a typo visible rather than
 *  silently blank. */
export function fillCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}
