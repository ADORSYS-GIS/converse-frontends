'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { useConsoleLocale } from './client';
import { LOCALE_COOKIE_MAX_AGE_SECONDS, LOCALE_COOKIE_NAME, type Locale } from './config';

/**
 * Switching language, without a reload and without a flicker (ADR 0017).
 *
 * The sequence is: write the cookie from the browser, then `router.refresh()`. `refresh()` re-runs
 * the Server Components for the CURRENT URL — which is the whole point of not putting the locale in
 * the path — so the root layout resolves the new cookie, loads the new bundle, and React reconciles
 * the tree in place. Nothing unmounts, no scroll position is lost, and the URL is byte-identical
 * before and after, so a link copied a second earlier still opens the same screen.
 *
 * The cookie is written CLIENT-SIDE rather than through a Server Action or a route handler on
 * purpose: it is a display preference with no server-side effect to authorize, and a round trip
 * before the refresh would put a whole request between the click and the re-render for nothing. It
 * is deliberately NOT `HttpOnly` for the same reason — this code has to be able to write it.
 *
 * `useTransition` keeps the refresh non-blocking, so `pending` can dim the control instead of the
 * page freezing on a slow connection.
 */
export interface LocaleSwitcher {
  locale: Locale;
  setLocale: (next: Locale) => void;
  pending: boolean;
}

export function useLocaleSwitcher(): LocaleSwitcher {
  const locale = useConsoleLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      // `SameSite=Lax` and no `Secure` flag: the console is served over plain HTTP in local
      // development, and a `Secure` cookie would silently never be set there — which would look
      // exactly like a broken switcher. Nothing in this cookie is sensitive; it names a language.
      document.cookie = `${LOCALE_COOKIE_NAME}=${next}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
      startTransition(() => router.refresh());
    },
    [locale, router]
  );

  return { locale, setLocale, pending };
}
