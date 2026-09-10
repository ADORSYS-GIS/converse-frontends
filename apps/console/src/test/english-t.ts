import { createInstance, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';

import admin from '../../locales/en/admin.json';
import auth from '../../locales/en/auth.json';
import common from '../../locales/en/common.json';
import dashboards from '../../locales/en/dashboards.json';
import nav from '../../locales/en/nav.json';
import reports from '../../locales/en/reports.json';
import settings from '../../locales/en/settings.json';
import { DEFAULT_NAMESPACE, NAMESPACES, type Namespace, type Translate } from '../i18n/config';

/**
 * A REAL i18next `t`, bound to English, for unit tests of the pure builders that now take one
 * (`navGroups`, `settingsNavGroups`, `adminNavGroups`, `translateDashboardPage`).
 *
 * Deliberately not a `(key) => key` stub. A stub would let this suite keep passing while a key was
 * misspelled, missing from the bundle, or pointing at an object instead of a string — which is the
 * whole class of bug a translated nav can have. Resolving against the SHIPPED `locales/en/*.json`
 * means a test that asserts `label === 'Refills queue'` is simultaneously asserting that the key
 * exists and that its English copy has not silently changed.
 *
 * English only, on purpose: German has its own coverage in `i18n-resources.test.ts` (parity) and
 * in Storybook's `de` stories (rendering). A per-locale assertion in every nav test would be the
 * translation table copied into the suite.
 *
 * The instance is created once at module load and `init()` is synchronous here (static resources,
 * no backend), so `englishT` is safe to call at the top of a `describe`.
 */
const instance = createInstance();
// `initReactI18next` registers this instance as react-i18next's DEFAULT, which is what makes
// `useTranslation()` resolve real English inside a component test that renders a piece of chrome
// WITHOUT mounting `ConsoleI18nProvider` — the shape most of this app's `.test.tsx` files already
// have. `src/test/setup.ts` imports this module for exactly that side effect, so no existing test
// needs a new wrapper, and none of them silently assert against raw i18n keys.
void instance.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: NAMESPACES as unknown as string[],
  defaultNS: DEFAULT_NAMESPACE,
  nsSeparator: ':',
  interpolation: { escapeValue: false },
  resources: {
    en: { common, nav, dashboards, admin, settings, auth, reports },
  } as unknown as Resource,
});

export function englishT(namespace: Namespace): Translate {
  return instance.getFixedT('en', namespace) as unknown as Translate;
}
