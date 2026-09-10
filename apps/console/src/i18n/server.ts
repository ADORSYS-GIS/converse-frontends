import { createInstance, type i18n as I18nInstance, type TFunction } from 'i18next';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { initReactI18next } from 'react-i18next/initReactI18next';

import {
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACE,
  LOCALE_COOKIE_NAME,
  NAMESPACES,
  resolveLocale,
  type Locale,
  type Namespace,
} from './config';
import { consoleResourcesBackend } from './resources';

/**
 * The **server** half of the console's i18n (ADR 0017).
 *
 * `next-i18next` is not used here and cannot be: its README states it is for the Pages Router, and
 * this console has been App Router since ADR 0009. What replaces it is the pattern i18next itself
 * documents for the App Router — a fresh instance PER REQUEST rather than the module-level
 * singleton `i18next.init()` gives you.
 *
 * The singleton is not a style preference: a Node server handles overlapping requests on one
 * module graph, so `i18n.changeLanguage('de')` for one visitor would flip the language of every
 * render in flight. `createInstance()` per request has no such seam, and `React.cache` collapses
 * the repeated calls WITHIN one request back down to one instance so a page that asks four
 * components for `t` still initializes once.
 *
 * Server-only by construction (`next/headers`). A Client Component reads `useTranslation()` from
 * `./client` instead, off the bundle this module's caller seeded it with.
 */

/**
 * The locale for THIS request: the `lb.locale` cookie, else `Accept-Language`, else `en`
 * (`resolveLocale` — the single statement of that order).
 *
 * `cache`d, so the dozen call sites in one render read the cookie jar once.
 */
export const getServerLocale = cache(async (): Promise<Locale> => {
  try {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
    return resolveLocale(
      cookieStore.get(LOCALE_COOKIE_NAME)?.value,
      headerList.get('accept-language')
    );
  } catch {
    /**
     * `next/headers` throws when there is no request scope at all — a Route Handler invoked
     * directly (which is how this app's `route.test.ts` files exercise them), a build-time static
     * render, a script. That is not an error condition for a LANGUAGE: "I could not read a
     * preference" and "no preference was expressed" are the same answer, and the answer is the
     * default locale.
     *
     * Deliberately narrow in what it can hide. Nothing else in this function can throw, so this
     * cannot swallow a real fault; and a missing/garbage cookie already falls through
     * `resolveLocale`'s own chain rather than reaching here.
     */
    return DEFAULT_LOCALE;
  }
});

/**
 * A fully initialized i18next instance for `locale`, with every namespace preloaded.
 *
 * Namespaces are loaded eagerly rather than on demand because `t` is handed out synchronously
 * below: a Server Component calling `t('admin:sessions.title')` must not get the key back because
 * `admin` had not landed. Seven small JSON files is a cheap way to make that impossible.
 *
 * `cache` keys on the argument, so two locales in one request (never happens today, but the report
 * pipeline could render one document per recipient) each get their own instance rather than
 * fighting over one.
 */
export const getI18nInstance = cache(async (locale: Locale): Promise<I18nInstance> => {
  const instance = createInstance();
  await instance
    .use(initReactI18next)
    .use(consoleResourcesBackend)
    .init({
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      ns: NAMESPACES as unknown as string[],
      defaultNS: DEFAULT_NAMESPACE,
      preload: [locale],
      // The console's own keys are dotted paths (`sessions.title`) and its copy contains real
      // colons ("Operator · Every account"), so the namespace separator is the explicit `:` only
      // and `keySeparator` stays i18next's default `.`.
      nsSeparator: ':',
      interpolation: {
        // React escapes for us; double-escaping would print `&amp;` in the UI and, worse, in the
        // Typst report's own data file.
        escapeValue: false,
      },
      react: { useSuspense: false },
    });
  return instance;
});

export interface ServerTranslation {
  t: TFunction;
  i18n: I18nInstance;
  locale: Locale;
}

/**
 * The one call a Server Component, Route Handler or report builder makes.
 *
 * `await getServerTranslation()` for the request's own locale; pass an explicit one when the
 * caller already resolved it (the root layout does, and hands the same value to the client
 * provider so both halves render the same language on the same pass).
 */
export async function getServerTranslation(
  locale?: Locale,
  namespace: Namespace | Namespace[] = DEFAULT_NAMESPACE
): Promise<ServerTranslation> {
  const resolved = locale ?? (await getServerLocale());
  const instance = await getI18nInstance(resolved);
  return {
    t: instance.getFixedT(resolved, namespace as string | string[]),
    i18n: instance,
    locale: resolved,
  };
}
