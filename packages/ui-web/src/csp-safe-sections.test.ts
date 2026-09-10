import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// authz-idp's human plane (lightbridge-authz#478, converse-frontends#409, plan D6). The four
// sections below render into apps/authz-ui, which authz-idp serves under
// `default-src 'self'; frame-ancestors 'none'` with no `data:` allowance
// (crates/lightbridge-authz-rest/src/static_assets.rs). Every daisyUI 5 component class in the
// `--fx-noise` set — `alert`/`btn`/`badge`/`checkbox`/`radio`/`toggle`/`menu`/`loading`/`tooltip`/
// `card`/`input`/`select`/`table`/`tabs`/`skeleton` — composites a `data:image/svg+xml` noise
// background in regardless of whether it is visually reachable, and a `data:` URI referenced by an
// APPLIED rule is fetched and CSP-blocked even at `background-size: 0%` (converse-frontends#407's
// evidence, recorded in `sections/notice-panel/component.tsx`'s own doc comment).
//
// `theme.css`'s `@plugin 'daisyui'` block now excludes the six parts that carry a `data:` URI at
// all (converse-frontends#443), so the built login bundle contains none — but that is an EMIT-side
// property, and this file is still the gate that stops a REACHABILITY regression: a section here
// pulling in a daisy-backed component would light up daisy classes in the render tree, which is a
// posture violation whether or not the CSS currently ships a `data:` URI. `verify-css-csp.mjs`
// cannot see that: it reads the built stylesheet, never the DOM.
// So this file, not that script, is the gate that actually stops a regression here.
//
// `apps/authz-ui/src/no-daisy-component-classes.test.ts` scans `apps/authz-ui/src/**/*.tsx` only
// — it cannot see a class contributed by an imported `ui-web` section, which is exactly the gap a
// section like this lives in. This file mirrors its forbidden-token list and closes that gap at
// the source.
const CSP_SAFE_SECTIONS = [
  'auth-panel-shell',
  'device-code-entry',
  'device-confirmation',
  'auth-error-panel',
] as const;

const FORBIDDEN = new Set([
  'alert',
  'btn',
  'badge',
  'checkbox',
  'radio',
  'toggle',
  'menu',
  'loading',
  'tooltip',
  'card',
  'input',
  'select',
  'table',
  'tabs',
  'skeleton',
]);

const SECTIONS_ROOT = join(import.meta.dirname, 'sections');

function sectionFiles(section: string): string[] {
  return readdirSync(join(SECTIONS_ROOT, section))
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => join(SECTIONS_ROOT, section, name));
}

/**
 * Extracts every class-string value that could land in a rendered `className` from a
 * `className={...}`/`className="..."` occurrence -- pragmatic brace/quote scanning, not a full
 * JSX parser, mirroring `apps/authz-ui/src/no-daisy-component-classes.test.ts`'s own extractor so
 * the two gates agree on what counts as "a className value".
 */
function extractClassNameValues(source: string): string[] {
  const values: string[] = [];
  const attrPattern = /className\s*=\s*/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrPattern.exec(source)) !== null) {
    const start = attrMatch.index + attrMatch[0].length;
    const opener = source[start];
    if (opener === '"' || opener === "'") {
      let end = start + 1;
      while (end < source.length && source[end] !== opener) end += 1;
      values.push(source.slice(start + 1, end));
      attrPattern.lastIndex = end + 1;
    } else if (opener === '{') {
      let depth = 0;
      let end = start;
      do {
        if (source[end] === '{') depth += 1;
        else if (source[end] === '}') depth -= 1;
        end += 1;
      } while (depth > 0 && end < source.length);
      const inner = source.slice(start + 1, end - 1);
      const literalPattern = /'([^']*)'|"([^"]*)"|`([^`]*)`/g;
      let literalMatch: RegExpExecArray | null;
      while ((literalMatch = literalPattern.exec(inner)) !== null) {
        values.push(literalMatch[1] ?? literalMatch[2] ?? literalMatch[3] ?? '');
      }
      attrPattern.lastIndex = end;
    }
  }
  return values;
}

/** Every relative (`.`-leading) import specifier in a source file. Bare package specifiers
 *  (`react`, `@storybook/react-vite`, `vitest`, ...) are irrelevant to this check and skipped. */
function relativeImports(source: string): string[] {
  const specifiers: string[] = [];
  const pattern = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    if (match[1].startsWith('.')) specifiers.push(match[1]);
  }
  return specifiers;
}

describe('CSP-safe sections', () => {
  it.each(CSP_SAFE_SECTIONS)('%s never uses a forbidden className token', (section) => {
    const violations: string[] = [];
    for (const file of sectionFiles(section)) {
      const source = readFileSync(file, 'utf8');
      for (const value of extractClassNameValues(source)) {
        for (const token of value.split(/\s+/).filter(Boolean)) {
          if (FORBIDDEN.has(token)) {
            violations.push(`${file}: forbidden className token "${token}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it.each(CSP_SAFE_SECTIONS)(
    '%s only imports from lib/, cn, its own files, or a sibling CSP-safe section',
    (section) => {
      const violations: string[] = [];
      for (const file of sectionFiles(section)) {
        const source = readFileSync(file, 'utf8');
        for (const specifier of relativeImports(source)) {
          // Same-directory files (`./component`, `./types`, `./fixtures`) are the section's own
          // module -- not a components/* import, nothing to police.
          if (specifier.startsWith('./')) continue;

          const allowed =
            specifier.startsWith('../../lib/') ||
            specifier === '../../cn' ||
            CSP_SAFE_SECTIONS.some(
              (sibling) => specifier === `../${sibling}` || specifier.startsWith(`../${sibling}/`)
            );

          if (!allowed) {
            violations.push(
              `${file}: import "${specifier}" does not resolve under ../../lib/, ../../cn, or a ` +
                `sibling CSP-safe section. If this names a component under ../../components/, ` +
                `restore the native-element implementation instead -- that component's daisy class ` +
                `is banned on this surface (converse-frontends#407) and verify-css-csp.mjs cannot ` +
                `see it: that script reads the built stylesheet, never the render tree.`
            );
          }
        }
      }
      expect(violations).toEqual([]);
    }
  );
});
