import resourcesToBackend from 'i18next-resources-to-backend';

import { LOCALES, NAMESPACES, type Locale, type Namespace } from './config';

/**
 * Where the console's copy actually lives: `apps/console/locales/<locale>/<namespace>.json`.
 *
 * The importer table is written out in full rather than built from a template literal
 * (`import(\`../../locales/${locale}/${namespace}.json\`)`). Turbopack turns a template-literal
 * `import()` into a context module that eagerly enumerates the whole directory — which works, but
 * makes the set of shipped bundles a property of what happens to be on disk rather than of what
 * this module declares. An explicit map is checked by `tsc` (a namespace added to `NAMESPACES`
 * without a file is a type error, not a runtime 404), resolves identically under Vitest's
 * resolver, and is what `resources.test.ts` walks to prove `de` has no key `en` lacks.
 */
type Loader = () => Promise<{ default: Record<string, unknown> }>;

const LOADERS: Record<Locale, Record<Namespace, Loader>> = {
  en: {
    common: () => import('../../locales/en/common.json'),
    nav: () => import('../../locales/en/nav.json'),
    dashboards: () => import('../../locales/en/dashboards.json'),
    admin: () => import('../../locales/en/admin.json'),
    settings: () => import('../../locales/en/settings.json'),
    auth: () => import('../../locales/en/auth.json'),
    reports: () => import('../../locales/en/reports.json'),
  },
  de: {
    common: () => import('../../locales/de/common.json'),
    nav: () => import('../../locales/de/nav.json'),
    dashboards: () => import('../../locales/de/dashboards.json'),
    admin: () => import('../../locales/de/admin.json'),
    settings: () => import('../../locales/de/settings.json'),
    auth: () => import('../../locales/de/auth.json'),
    reports: () => import('../../locales/de/reports.json'),
  },
};

/**
 * The i18next backend the SERVER instance uses — one lazy import per (locale, namespace), so a
 * request that renders only the shell pays for `common`/`nav` and not for the nineteen-panel
 * `dashboards` bundle.
 *
 * The CLIENT deliberately does not use it: `ConsoleI18nProvider` is handed an already-resolved
 * resource bundle by the root layout, which makes `init()` synchronous and removes the one class
 * of bug this pattern is prone to — a first client render where `t()` returns the key because the
 * namespace has not landed yet.
 */
export const consoleResourcesBackend = resourcesToBackend(
  async (language: string, namespace: string) => {
    const loader = LOADERS[language as Locale]?.[namespace as Namespace];
    if (!loader) {
      throw new Error(
        `[console] no translation bundle for locale "${language}" namespace "${namespace}" — ` +
          'every namespace in `NAMESPACES` needs a file under `locales/<locale>/`.'
      );
    }
    return (await loader()).default;
  }
);

/** Every namespace for one locale, in the shape i18next's `resources` option takes. Used to seed
 *  the client instance from the server render (see `client.tsx`) and by `resources.test.ts`. */
export async function loadLocaleBundle(locale: Locale): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    NAMESPACES.map(async (namespace) => [namespace, (await LOADERS[locale][namespace]()).default])
  );
  return Object.fromEntries(entries) as Record<string, unknown>;
}

/** `{ en: { common: {…}, … }, de: { … } }` — every locale, every namespace. Only the parity test
 *  wants this; nothing in the app ships all locales at once. */
export async function loadAllBundles(): Promise<Record<Locale, Record<string, unknown>>> {
  const entries = await Promise.all(
    LOCALES.map(async (locale) => [locale, await loadLocaleBundle(locale)] as const)
  );
  return Object.fromEntries(entries) as Record<Locale, Record<string, unknown>>;
}
