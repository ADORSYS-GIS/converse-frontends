// Counts the hand-written Tailwind utilities a component still carries — and nothing else.
//
// The owner's bar (2026-08-29): "Tiny css classes per component (max 3, and cva adds max 2 per
// variant). All components use daisyUI x Base UI." Base UI owns behaviour, daisyUI owns paint, and
// the console's own contract lives in named `@utility` parts in `theme.css`. A raw Tailwind
// utility written into a component is the thing this measures, because it is the thing that
// duplicates and drifts.
//
// RE-BASELINED 2026-08-30, on the owner's call. The first version tokenised every string literal
// in the file, which over-reported badly and in four distinct ways — measured across two rounds at
// roughly 45% of any figure:
//
//   1. COMMENT PROSE. A backtick-quoted hyphenated word reads exactly like a class, so
//      `aria-labelledby`, `data-vaul-drawer-direction` and file paths were all counted. `meter`
//      scored 10 of which 8 were prose; `tooltip` scored 8 with ZERO raw Tailwind in it.
//   2. `@utility` NAMES — the sanctioned destination — charged once per use site. `console-header`
//      scored 6, five of them named parts.
//   3. IMPORT SPECIFIERS, notably `'class-variance-authority'`.
//   4. OCCURRENCES rather than distinct classes: one class at four return sites scored 4.
//
// Comments and imports are now stripped before tokenising, `@utility` names are read from
// `theme.css` and counted as named parts, and classes are de-duplicated. The historical figures
// under the old counter were 1424 -> 651 -> 307 -> 249 -> 204; they are NOT comparable with what
// this reports now, which is why they are recorded here rather than silently replaced.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_BUDGET = 3;

const DAISY = new Set(
  `btn btn-primary btn-secondary btn-ghost btn-sm btn-md btn-lg btn-outline btn-block btn-square
   btn-circle btn-active btn-disabled input input-ghost textarea select table table-xs table-sm
   table-pin-rows menu menu-sm menu-title menu-active menu-horizontal tabs tab tab-active toggle
   checkbox radio skeleton join join-item kbd kbd-sm fieldset label badge card alert stat collapse
   dropdown swap indicator mask divider steps timeline status toast validator react-day-picker`.split(
    /\s+/
  )
);

/**
 * The console's own named parts, read from `theme.css` — the place a correction is SUPPOSED to
 * live, so using one is the goal, not a cost.
 *
 * Two shapes count. The `@utility <name>` heads themselves, and the descendant HOOKS declared
 * inside them (`& .stat-card-head { … }`): a part with internal structure has to name its pieces
 * somewhere, and those names are as much a part of the block as its own selector. Counting them as
 * hand-written utilities scored `stat-card` a 7 for four class names that live entirely in
 * `theme.css`.
 */
export function themeUtilities(themeCssPath: string): Set<string> {
  const css = readFileSync(themeCssPath, 'utf8');
  const heads = [...css.matchAll(/^@utility\s+([a-z][a-z0-9-]*)/gm)].map((m) => m[1]);
  const hooks = [...css.matchAll(/&\s*\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]);
  return new Set([...heads, ...hooks]);
}

/** Comments and import specifiers are prose, not CSS. Strip them before anything else. */
function strippedSource(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/^\s*import\s[\s\S]*?from\s*['"][^'"]*['"];?/gm, ' ')
    .replace(/^\s*import\s*['"][^'"]*['"];?/gm, ' ');
}

const CLASSY = /^(?:[a-z]|\[)[a-z0-9!:[\]\-_/.&>+()#%,]*$/i;

/**
 * `aria-label` / `aria-labelledby` / `data-testid` read as classes — lowercase and hyphenated —
 * but they are ATTRIBUTE NAMES, quoted as destructuring keys (`rest['aria-label']`). Tailwind's
 * own aria/data utilities are always VARIANTS and therefore always carry a `:` (`aria-checked:…`,
 * `data-[active=true]:…`), so a bare one with no separator is never a class.
 */
const ATTRIBUTE_NAME = /^(?:aria|data)-[a-z-]+$/;

function classTokens(source: string): string[] {
  const tokens: string[] = [];
  for (const match of strippedSource(source).matchAll(/["'`]([^"'`\n]{2,})["'`]/g)) {
    const parts = match[1].trim().split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const classy = parts.filter(
      (p) => CLASSY.test(p) && !ATTRIBUTE_NAME.test(p) && (/[-:]/.test(p) || DAISY.has(p))
    );
    // A literal is a class list only if most of it reads as classes — keeps aria strings,
    // locale codes and prop values out.
    if (classy.length < Math.max(1, parts.length * 0.6)) continue;
    tokens.push(...classy);
  }
  return tokens;
}

export interface ClassAudit {
  component: string;
  /** Distinct raw Tailwind utilities written into the component. The number under the bar. */
  utils: number;
  /** Distinct daisyUI component classes adopted. */
  daisy: number;
  /** Distinct `theme.css` `@utility` parts used — the sanctioned destination. */
  named: number;
}

export function auditComponent(dir: string, theme: Set<string>): Omit<ClassAudit, 'component'> {
  const utils = new Set<string>();
  const daisy = new Set<string>();
  const named = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!/^(component\.tsx|cva\.ts|.*-classes\.ts)$/.test(file)) continue;
    for (const token of classTokens(readFileSync(join(dir, file), 'utf8'))) {
      const bare = token.split(':').pop() ?? token;
      if (DAISY.has(token) || DAISY.has(bare)) daisy.add(bare);
      else if (theme.has(token) || theme.has(bare)) named.add(bare);
      else utils.add(token);
    }
  }
  return { utils: utils.size, daisy: daisy.size, named: named.size };
}

export function auditAll(root: string, themeCssPath = join(root, '..', 'theme.css')): ClassAudit[] {
  const theme = themeUtilities(themeCssPath);
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((component) => ({ component, ...auditComponent(join(root, component), theme) }))
    .sort((a, b) => b.utils - a.utils);
}
