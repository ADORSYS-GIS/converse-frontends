/**
 * The `GET /branding/override.css` filter (issue #368, Phase H — runtime white-label branding).
 *
 * Owner design, verbatim: "[branding.style] should be only for daisyui css variables, like
 * --color-primary, ... But the theme names would be preserved." An operator-authored override
 * file is a real risk surface — a stray selector or an unrelated property is a config typo that
 * could recolor or, worse, restructure the console's layout, not just its palette. This module is
 * the honesty boundary: it keeps ONLY what the owner's design allows and drops everything else,
 * loudly (the caller logs `strippedSelectors`/`strippedDeclarations` server-side), rather than
 * either rejecting the whole file (too brittle for an operator hand-editing colours) or passing it
 * through untouched (the actual risk this filter exists to remove).
 *
 * What survives, exactly:
 *  - A custom-property declaration (`--foo: value;`) directly inside a `:root { ... }` block —
 *    "top level" in the spec's own words, and this codebase's own convention for an unscoped
 *    default (see `packages/ui-web/src/theme.css`'s own `:root`-adjacent aliasing comments).
 *  - The same, inside a `[data-theme="…"]` block — daisyUI's own per-theme selector shape, which
 *    is what "theme names preserved" means: the SELECTOR survives verbatim (whatever theme name
 *    the operator writes, `black`/`wireframe`/anything else), only its declarations are filtered.
 *  - A selector may be a comma-separated list of the two forms above (`:root, [data-theme="x"]`
 *    is theme.css's own compiled shape) — every part must match, or the whole rule is dropped.
 *
 * Everything else — any other selector (`.foo`, `body`, `*`), any at-rule (`@media`, `@import`,
 * `@font-face`), and any non-custom-property declaration even inside an allowed block (`color:
 * red;` inside `:root {}`) — is stripped in full.
 *
 * Hand-rolled rather than a real CSS parser (no `postcss` production dependency for a filter this
 * narrow — see the PR body for why): a single-pass, brace-depth/quote-aware scanner. Comments are
 * stripped first; an unterminated `/*` consumes the rest of the file (malformed input must never
 * throw or hang, only produce less output).
 */

export type BrandingCssFilterResult = {
  /** The filtered stylesheet — only allowed selectors, only custom-property declarations. */
  css: string;
  /** Selectors (as written, trimmed) whose entire rule was dropped. */
  strippedSelectors: string[];
  /** `"<selector>": "<declaration>"` pairs dropped from an otherwise-allowed block. */
  strippedDeclarations: string[];
};

const ALLOWED_SELECTOR_PART = /^(:root|\[data-theme=(["'])[^"']*\2\])$/;
const CUSTOM_PROPERTY_DECLARATION = /^(--[A-Za-z0-9_-]+)\s*:\s*(.+)$/;

function stripComments(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2);
      if (end === -1) break; // unterminated comment: drop the rest of the file, not throw
      i = end + 2;
      continue;
    }
    out += input[i];
    i++;
  }
  return out;
}

function isAllowedSelector(selector: string): boolean {
  const trimmed = selector.trim();
  if (!trimmed) return false;
  return trimmed
    .split(',')
    .map((part) => part.trim())
    .every((part) => ALLOWED_SELECTOR_PART.test(part));
}

/** Splits a block body into `;`-terminated declaration candidates, quote-aware so a value like
 *  `content: ";"` (unlikely for a custom property, but malformed input must not crash) doesn't
 *  split mid-string. The trailing fragment after the last `;` (if non-blank) is included too, so
 *  a declaration missing its final semicolon is still evaluated rather than silently dropped. */
function splitDeclarations(body: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ';') {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

export function filterBrandingCss(input: string): BrandingCssFilterResult {
  const text = stripComments(input);
  const strippedSelectors: string[] = [];
  const strippedDeclarations: string[] = [];
  const keptBlocks: string[] = [];

  let i = 0;
  let selectorStart = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '"' || char === "'") {
      // Skip an entire quoted string verbatim (a selector like `[data-theme="a{b"]` must not
      // confuse the brace scanner below).
      const quote = char;
      i++;
      while (i < text.length && text[i] !== quote) i++;
      i++;
      continue;
    }
    if (char === '{') {
      const selector = text.slice(selectorStart, i).trim();
      // Find the matching close brace, tracking nesting depth (a malformed/at-rule block may
      // itself contain braces) and quotes, so we always land back at depth 0 correctly.
      let depth = 1;
      let j = i + 1;
      while (j < text.length && depth > 0) {
        const c = text[j];
        if (c === '"' || c === "'") {
          const quote = c;
          j++;
          while (j < text.length && text[j] !== quote) j++;
        } else if (c === '{') {
          depth++;
        } else if (c === '}') {
          depth--;
        }
        j++;
      }
      const body = text.slice(i + 1, depth === 0 ? j - 1 : j);

      if (selector && isAllowedSelector(selector)) {
        const keptDeclarations: string[] = [];
        for (const raw of splitDeclarations(body)) {
          const declaration = raw.trim();
          if (!declaration) continue;
          const match = declaration.match(CUSTOM_PROPERTY_DECLARATION);
          if (match) {
            keptDeclarations.push(`  ${match[1]}: ${match[2]};`);
          } else {
            strippedDeclarations.push(`${selector}: ${declaration}`);
          }
        }
        if (keptDeclarations.length > 0) {
          keptBlocks.push(`${selector} {\n${keptDeclarations.join('\n')}\n}`);
        }
      } else if (selector) {
        strippedSelectors.push(selector);
      }

      i = j;
      selectorStart = j;
      continue;
    }
    if (char === ';') {
      // A top-level statement with no block at all (`@import url(...);`, or a bare, invalid
      // `--foo: red;` outside any selector) — never valid custom-property placement, so it is
      // dropped and logged like any other stripped selector.
      const statement = text.slice(selectorStart, i).trim();
      if (statement) strippedSelectors.push(statement);
      i++;
      selectorStart = i;
      continue;
    }
    i++;
  }

  return {
    css: keptBlocks.join('\n\n'),
    strippedSelectors,
    strippedDeclarations,
  };
}
