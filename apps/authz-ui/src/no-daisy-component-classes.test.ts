import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// converse-frontends#407: whether daisyUI's component classes (and other fx-noise -- data: URI
// backgrounds, box-shadow stacks, etc.) are CSP-compatible on this app is undecided -- this app is
// served under a strict `default-src 'self'` CSP with no `'unsafe-inline'`
// (`crates/lightbridge-authz-rest/src/static_assets.rs`), and daisyUI component classes may rely
// on inline `style` attributes or other constructs that CSP forbids. Until #407 lands, this app
// may only use `packages/ui-web` semantic tokens and plain Tailwind utilities in its own
// `src/**/*.tsx` -- never one of daisyUI's component classes below. This test enforces that at the
// className level so a regression fails CI instead of surfacing as a runtime CSP violation.
const FORBIDDEN_COMPONENT_CLASSES = new Set([
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

function collectTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      out.push(...collectTsxFiles(full));
    } else if (stats.isFile() && full.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extracts every class-string value that could land in a rendered `className` from a
 * `className={...}`/`className="..."` occurrence in a source file -- pragmatic brace/quote
 * scanning, not a full JSX parser, which this narrow check does not need. A plain
 * `className="a b"` yields its content directly; a `className={cn('a b', x)}` (or any other
 * `{...}` expression) yields every quoted string literal found inside the braces, since any of
 * them could end up in the rendered class list.
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

describe('no gated daisyUI/fx-noise component classes', () => {
  it('never uses a forbidden component class in a className string, in src/**/*.tsx', () => {
    const srcDir = resolve(import.meta.dirname, '.');
    const files = collectTsxFiles(srcDir);
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const value of extractClassNameValues(source)) {
        const tokens = value.split(/\s+/).filter((token) => token.length > 0);
        for (const token of tokens) {
          if (FORBIDDEN_COMPONENT_CLASSES.has(token)) {
            violations.push(`${file}: forbidden className token "${token}"`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
