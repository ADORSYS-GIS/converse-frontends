/**
 * The console's i18n vocabulary — locales, namespaces, and the cookie the switcher writes.
 *
 * Deliberately dependency-free (no `i18next`, no `node:*`, no React): `middleware.ts` runs on the
 * edge runtime and the client bundle imports the same constants, so anything heavier here would
 * either fail to build or ship a second copy of i18next into the middleware chunk. The same split
 * `server/cookie-names.ts` already makes, for the same reason.
 *
 * ADR 0017. English is the SOURCE OF TRUTH: every key exists in `locales/en/*.json` first, and
 * `de` is a translation of it — never the other way round, and never a key that exists only in
 * `de`.
 */

/** Every locale this console ships. `en` first — it is the fallback and the source of truth. */
export const LOCALES = ['en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * The cookie the locale switcher writes and every request resolves from.
 *
 * ADR 0013 keeps console paths stable, so there is NO `/[locale]/…` URL prefix: a link a person
 * pastes into a ticket must open the same screen for whoever follows it, whatever language either
 * of them reads in. That makes the locale a per-visitor PREFERENCE rather than part of the
 * resource's identity — which is exactly what a cookie is for. The cost is that a page's HTML now
 * varies by cookie; every console route already opts out of shared caching (`shared/
 * uncacheable-paths.ts`), so there is no cache key to poison.
 */
export const LOCALE_COOKIE_NAME = 'lb.locale';

/** A year. The preference is not security-sensitive and re-asking every session would be noise. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * The namespaces, one per AREA of the console rather than one per screen: a screen's copy moves
 * between containers often, an area's does not. `common` carries what every area repeats (empty
 * states, retry lines, units); `nav` is the chrome and the command palette; `dashboards` is
 * `dashboards.yaml`'s panel titles/subtitles; `reports` is the Typst templates' fixed labels,
 * resolved server-side into `data.json` (see `server/reports/report-data.ts`).
 */
export const NAMESPACES = [
  'common',
  'nav',
  'dashboards',
  'admin',
  'settings',
  'auth',
  'reports',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE: Namespace = 'common';

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

/**
 * `Accept-Language` -> a locale we ship, or `undefined`.
 *
 * Quality values are honoured (`de;q=0.9, en;q=0.8` picks `de`) and a region subtag matches its
 * base language (`de-AT` -> `de`), because a browser configured for Austrian German is asking for
 * German. Anything unrecognised falls through to `undefined` so the caller can apply
 * `DEFAULT_LOCALE` itself rather than this function silently inventing one.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='))
        ?.slice(2);
      const weight = quality === undefined ? 1 : Number.parseFloat(quality);
      return { tag: tag.trim().toLowerCase(), weight: Number.isNaN(weight) ? 0 : weight };
    })
    .filter((entry) => entry.tag.length > 0 && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  for (const entry of ranked) {
    const base = entry.tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return undefined;
}

/**
 * The one resolution order, stated once (ADR 0017): an explicit choice beats the browser's
 * preference, and the browser's preference beats the default.
 *
 * Callers supply the two raw inputs rather than reading them here, because the readers differ per
 * runtime — `next/headers` in a Server Component, `document.cookie` in the switcher's own optimistic
 * update — and this module must stay importable from both.
 */
export function resolveLocale(
  cookieValue: string | undefined | null,
  acceptLanguage: string | null | undefined
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/**
 * The BCP-47 tag handed to `Intl.*` and to `<html lang>`.
 *
 * Identical to the locale id today (both `en` and `de` are valid tags on their own) and separate
 * from it on purpose: the locale id is a resource-bundle key — the name of a directory under
 * `locales/` — and a future `pt-BR` bundle would want a directory name that is still a legal tag,
 * which is a constraint worth naming rather than assuming.
 */
export function intlLocale(locale: Locale): string {
  return locale;
}

/**
 * The narrow shape a pure builder takes when it needs copy — `navGroups`, `settingsNavGroups`,
 * `adminNavGroups` and the dashboard key resolver all declare this rather than i18next's own
 * `TFunction`.
 *
 * Two reasons, both practical. `TFunction`'s generics are keyed on the declared namespace and
 * resource types, so a function that takes one becomes awkward to call from a module that does not
 * know which namespace the caller bound; and a unit test for a pure nav builder should be able to
 * hand it a two-line stub without standing up an i18next instance. Both `t` from
 * `useTranslation(ns)` and `getFixedT(locale, ns)` satisfy this structurally.
 */
export type Translate = (key: string, options?: Record<string, unknown>) => string;
