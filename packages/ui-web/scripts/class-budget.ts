// Counts hand-written Tailwind utility classes vs adopted daisyUI component classes, per component.
//
// The owner's definition of done (2026-08-29): "tiny css classes per component — max 3, and cva
// adds max 2 per variant. All components use daisyUI x Base UI." Base UI owns behaviour, daisy owns
// paint; a hand-written utility is only justified where neither ships the thing.
//
// This is a RATCHET, not a gate that was ever green: it pins the current worst-case per component
// so the number can only fall. Lower `BUDGET` entries as components are converted; a component
// absent from `BUDGET` must come in at or under `DEFAULT_BUDGET`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_BUDGET = 3;

const DAISY = new Set(
  `btn btn-primary btn-secondary btn-ghost btn-sm btn-md btn-outline btn-block btn-square input
   input-ghost textarea select table table-xs table-sm table-pin-rows menu menu-sm menu-title tabs
   tab tab-active toggle checkbox radio skeleton join join-item kbd fieldset label badge card alert
   stat collapse dropdown swap indicator mask divider steps timeline status toast validator
   react-day-picker`.split(/\s+/),
);

const CLASSY = /^(?:[a-z]|\[)[a-z0-9!:[\]\-_/.&>+()#%,]*$/i;

/** Every string literal in the file that reads as a class list, split into tokens. */
function classTokens(source: string): string[] {
  const tokens: string[] = [];
  for (const match of source.matchAll(/["'`]([^"'`\n]{2,})["'`]/g)) {
    const parts = match[1].trim().split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const classy = parts.filter((p) => CLASSY.test(p) && (/[-:]/.test(p) || DAISY.has(p)));
    // A literal is a class list only if most of it looks like classes — this keeps prose,
    // aria strings and import paths out of the count.
    if (classy.length < Math.max(1, parts.length * 0.6)) continue;
    tokens.push(...classy);
  }
  return tokens;
}

export function auditComponent(dir: string): { utils: number; daisy: number } {
  let utils = 0;
  let daisy = 0;
  for (const file of readdirSync(dir)) {
    if (!/^(component\.tsx|cva\.ts|.*-classes\.ts)$/.test(file)) continue;
    for (const token of classTokens(readFileSync(join(dir, file), 'utf8'))) {
      if (DAISY.has(token) || DAISY.has(token.split(':').pop() ?? '')) daisy += 1;
      else utils += 1;
    }
  }
  return { utils, daisy };
}

export interface ClassAudit {
  component: string;
  utils: number;
  daisy: number;
}

export function auditAll(root: string): ClassAudit[] {
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => ({ component: name, ...auditComponent(join(root, name)) }))
    .sort((a, b) => b.utils - a.utils);
}
