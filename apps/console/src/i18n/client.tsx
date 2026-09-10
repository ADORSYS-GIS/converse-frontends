'use client';

import { createInstance, type Resource, type i18n as I18nInstance } from 'i18next';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';

import {
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACE,
  LOCALES,
  NAMESPACES,
  intlLocale,
  type Locale,
} from './config';

/**
 * The **client** half of the console's i18n (ADR 0017).
 *
 * The instance is created SYNCHRONOUSLY from resources the server already resolved and passed down
 * (`app/layout.tsx` -> `client/providers.tsx` -> here), not from a backend that fetches them.
 * i18next's `init()` is synchronous when it has nothing to load, so `t()` returns real copy on the
 * very first client render — no Suspense boundary, no key-flash, and no hydration mismatch against
 * the server render, which used the same bundle.
 *
 * The instance is held in state with a lazy initializer rather than in a `useMemo`: it is mutable,
 * long-lived state, and a memo is allowed to be discarded and recomputed at React's discretion —
 * which would throw the resource store away mid-session.
 */

/** The active locale, for the things `t()` cannot do: `Intl.NumberFormat`, `Intl.DateTimeFormat`,
 *  and the switcher's own "which one is checked". */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function useConsoleLocale(): Locale {
  return useContext(LocaleContext);
}

/** The BCP-47 tag for the active locale — what every `Intl.*` constructor in the console takes. */
export function useIntlLocale(): string {
  return intlLocale(useConsoleLocale());
}

export interface ConsoleI18nProviderProps {
  locale: Locale;
  /** `{ common: {...}, nav: {...}, … }` for `locale` — every namespace, resolved server-side. */
  resources: Record<string, unknown>;
  children: ReactNode;
}

function createClientInstance(locale: Locale, resources: Record<string, unknown>): I18nInstance {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    // Only the ACTIVE locale is shipped, so `fallbackLng` resolves within the same bundle when
    // that locale is `en` and is inert otherwise. A `de` key with no translation would therefore
    // render as the key — which is why `i18n-resources.test.ts` proves parity at build time rather
    // than shipping a second locale in every payload to paper over it at runtime.
    resources: { [locale]: resources } as unknown as Resource,
    ns: NAMESPACES as unknown as string[],
    defaultNS: DEFAULT_NAMESPACE,
    // The console's keys are dotted paths and its copy contains real colons ("Operator · Every
    // account"), so the namespace separator is an explicit `:` and `keySeparator` keeps its `.`.
    nsSeparator: ':',
    interpolation: { escapeValue: false },
    // With `resources` supplied inline and no backend plugin registered, i18next has nothing to
    // load, so `init()` completes SYNCHRONOUSLY: the store is populated before this function
    // returns, and the first `t()` on the first render returns real copy rather than the key. That
    // is also why no Suspense boundary is needed.
    react: { useSuspense: false },
  });
  return instance;
}

export function ConsoleI18nProvider({ locale, resources, children }: ConsoleI18nProviderProps) {
  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3). This is not view state and could not be: it is
   * the i18next INSTANCE — a long-lived object with a resource store, not a fact about what the
   * visitor is looking at. What IS a fact about the session, the chosen locale, lives in the
   * `lb.locale` cookie precisely so it does not need a URL param (ADR 0017 / ADR 0013: console
   * paths stay stable). `useState(factory)` rather than `useMemo` because a memo may be discarded
   * and recomputed at React's discretion, which would throw the store away mid-session.
   */
  const [instance] = useState(() => createClientInstance(locale, resources));

  // A locale switch is a cookie write plus `router.refresh()` (`use-locale-switcher.ts`), which
  // re-renders this provider with a new locale and a new bundle rather than remounting it — so the
  // long-lived instance has to be told. Guarded on `instance.language`, so an ordinary re-render
  // does nothing at all.
  useEffect(() => {
    if (instance.language === locale) return;
    for (const [namespace, bundle] of Object.entries(resources)) {
      instance.addResourceBundle(locale, namespace, bundle as object, true, true);
    }
    void instance.changeLanguage(locale);
  }, [instance, locale, resources]);

  return (
    <LocaleContext.Provider value={locale}>
      <I18nextProvider i18n={instance}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export { useTranslation, LOCALES };
