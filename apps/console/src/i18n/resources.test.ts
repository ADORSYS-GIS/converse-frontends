import { describe, expect, it } from 'vitest';

import { LOCALES, NAMESPACES, localeFromAcceptLanguage, resolveLocale } from './config';
import { loadAllBundles } from './resources';

/**
 * The one invariant that makes shipping a single locale per request safe (ADR 0017).
 *
 * The client is handed ONLY the active locale's bundle — that is what lets `init()` be synchronous
 * and the first paint be translated — so `fallbackLng: 'en'` has nothing to fall back TO when the
 * active locale is `de`. A German key with no entry therefore renders as the KEY, on screen, in
 * production. The trade is deliberate: a payload that carried English alongside German for every
 * request would hide exactly that gap behind a plausible-looking English word, and nobody would
 * ever notice a screen was half-translated.
 *
 * This test is the other half of that trade. Parity is proved at build time, so the runtime never
 * needs a safety net.
 */
describe('locale bundles', () => {
  it('gives every English key a German translation, and adds none of its own', async () => {
    const bundles = await loadAllBundles();

    for (const namespace of NAMESPACES) {
      const en = flatten(bundles.en[namespace]);
      const de = flatten(bundles.de[namespace]);

      const missing = [...en].filter((key) => !de.has(key));
      const extra = [...de].filter((key) => !en.has(key));

      expect(missing, `${namespace}: keys with no German translation`).toEqual([]);
      // English is the SOURCE OF TRUTH: a key that exists only in `de` is unreachable — nothing
      // renders it — and is almost always a rename that was applied to one file and not the other.
      expect(extra, `${namespace}: German keys with no English original`).toEqual([]);
    }
  });

  it('never leaves a translated value empty', async () => {
    const bundles = await loadAllBundles();
    for (const locale of LOCALES) {
      for (const namespace of NAMESPACES) {
        for (const [key, value] of entries(bundles[locale][namespace])) {
          expect(value.trim().length, `${locale}/${namespace}: ${key} is empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps every interpolation placeholder identical across locales', async () => {
    const bundles = await loadAllBundles();
    for (const namespace of NAMESPACES) {
      const en = new Map(entries(bundles.en[namespace]));
      const de = new Map(entries(bundles.de[namespace]));
      for (const [key, english] of en) {
        const german = de.get(key);
        if (german === undefined) continue;
        // A translation that dropped `{{count}}` would render a sentence with a hole in it, and a
        // translation that invented `{{total}}` would print the placeholder verbatim — neither is
        // a type error, and neither shows up until somebody reads the screen in German.
        expect(placeholders(german), `${namespace}: ${key}`).toEqual(placeholders(english));
      }
    }
  });
});

describe('locale resolution', () => {
  it('prefers the cookie, then Accept-Language, then English', () => {
    expect(resolveLocale('de', 'en-GB,en;q=0.9')).toBe('de');
    expect(resolveLocale(undefined, 'de-AT,de;q=0.9,en;q=0.5')).toBe('de');
    expect(resolveLocale(undefined, null)).toBe('en');
  });

  it('ignores a cookie value that is not a locale we ship', () => {
    // A cookie is client-writable; a junk value must fall through to the next rung rather than
    // reaching i18next as a language with no bundle.
    expect(resolveLocale('klingon', 'de')).toBe('de');
    expect(resolveLocale('', null)).toBe('en');
  });

  it('honours quality values and matches a region subtag to its base language', () => {
    expect(localeFromAcceptLanguage('en;q=0.4, de;q=0.9')).toBe('de');
    expect(localeFromAcceptLanguage('de-CH')).toBe('de');
    expect(localeFromAcceptLanguage('fr-FR,fr;q=0.9')).toBeUndefined();
    // `q=0` means "explicitly not this one".
    expect(localeFromAcceptLanguage('de;q=0')).toBeUndefined();
  });
});

function flatten(bundle: unknown, prefix = '', out = new Set<string>()): Set<string> {
  for (const [key, value] of Object.entries(bundle as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) flatten(value, path, out);
    else out.add(path);
  }
  return out;
}

function entries(bundle: unknown, prefix = '', out: [string, string][] = []): [string, string][] {
  for (const [key, value] of Object.entries(bundle as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) entries(value, path, out);
    else out.push([path, String(value)]);
  }
  return out;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
}
