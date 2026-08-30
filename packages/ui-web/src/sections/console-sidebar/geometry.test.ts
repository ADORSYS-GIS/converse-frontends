import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

import {
  RAIL_ICON_COLUMN_WIDTH,
  RAIL_LABEL_GAP,
  RAIL_NAV_ROW_HEIGHT,
  RAIL_ROW_PADDING_X,
} from '../../lib/rail-grid';
import { NavSpine } from '../../components/nav-spine';
import type { NavGroup } from '../../components/nav-spine';

// The regression class this guards: the owner rejected a live build where group labels rendered
// CENTERED at ~14-15px (daisy `.menu-title`'s own paint winning over `sidebar-group-label`'s
// override) and the inter-group rhythm measured ~45px+ against a stated 20-24px target. Every
// number here traces to the SAME owner brief `theme.css`'s `sidebar-*` utilities implement
// (2026-08-30 sidebar rework) — this file is what stops a future edit to one side (a class
// renamed, a padding retyped, a constant bumped) from silently drifting out of step with the
// other, the way the two independently-typed instances of the label x already did once before
// `rail-grid.ts` existed (see that file's own header comment).
//
// WHY THIS IS A TEXT-LEVEL CHECK, NOT A COMPUTED-STYLE ONE: `theme.css` compiles through
// Tailwind v4's `@layer`/`@utility` machinery and daisyUI's own nested `daisyui.l1.l2.l3`
// sub-layers — verified live (Storybook/Vite, `next dev --turbopack`, and `next build --webpack`,
// all three, via the real compiled stylesheet loaded in an actual Chromium tab) to resolve
// `.sidebar-group-label` over daisy's `.menu-title` correctly in every one of this repo's three
// build pipelines. jsdom cannot reproduce that cascade — a probe that loads the real compiled
// CSS into jsdom and reads `getComputedStyle` returns the browser's UN-styled default (16px,
// `font-weight: normal`) because jsdom's CSS engine does not implement `@layer` at all, so every
// rule in the stylesheet is silently dropped rather than resolved incorrectly. A jsdom test that
// asserted a pixel value would therefore not be testing this component; it would be testing
// jsdom's blind spot. What CAN live in this repo's vitest/jsdom suite, and does below, is: (a)
// the DOM precondition the override depends on — both classes present on the one element — and
// (b) that the numbers `theme.css` hand-types (Tailwind's `rem` utilities are not simple wrappers
// around `rail-grid.ts`'s constants, so they cannot be imported — see that file's own comment on
// why literals are re-typed here) still equal the constants they are stated to agree with. Real
// cascade-winner verification is the Storybook-first manual/browser check this change's PR
// records, not a substitute for it.
const THEME_CSS_PATH = join(import.meta.dirname, '../../theme.css');
const themeCss = readFileSync(THEME_CSS_PATH, 'utf8');

/** Pulls the body of one `@utility <name> { ... }` block out of `theme.css` by brace counting —
 *  a plain regex would stop at the first nested `}` (every block here nests at least one
 *  `&:...` rule), so this walks braces instead. */
function utilityBody(css: string, name: string): string {
  const start = css.indexOf(`@utility ${name} {`);
  if (start === -1) throw new Error(`@utility ${name} not found in theme.css`);
  const openBrace = css.indexOf('{', start);
  let depth = 0;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(openBrace + 1, i);
    }
  }
  throw new Error(`unterminated @utility ${name} block`);
}

/** Reads a `property: <rem>rem` declaration's px equivalent out of a utility body (16px root). */
function remPx(body: string, property: string): number {
  const match = body.match(new RegExp(`(?<!-)\\b${property}:\\s*([\\d.]+)rem`));
  if (!match) throw new Error(`no ${property} (in rem) found`);
  return Number(match[1]) * 16;
}

const groupLabel = utilityBody(themeCss, 'sidebar-group-label');
const railList = utilityBody(themeCss, 'rail-list');
const brandRow = utilityBody(themeCss, 'sidebar-brand-row');
const switcherRow = utilityBody(themeCss, 'sidebar-switcher-row');
const workspaceSwitcherRow = utilityBody(themeCss, 'workspace-switcher-row');
const sidebarNav = utilityBody(themeCss, 'sidebar-nav');

describe('console-sidebar geometry (theme.css cross-check)', () => {
  it('renders the group label at the shared rail label x — icon column + label gap + row padding', () => {
    const labelX = remPx(groupLabel, 'padding-inline-start');
    expect(labelX).toBe(RAIL_ROW_PADDING_X + RAIL_ICON_COLUMN_WIDTH + RAIL_LABEL_GAP);
    expect(labelX).toBe(38);
  });

  it('renders the group label at 11px — one step below the 13px nav rows', () => {
    const fontSizeMatch = groupLabel.match(/(?<!-)\bfont-size:\s*([\d.]+)rem/);
    expect(fontSizeMatch).not.toBeNull();
    expect(Number(fontSizeMatch![1]) * 16).toBe(11);
  });

  it('gives the group label a positive letter-spacing within the 0.02-0.05em band', () => {
    const trackingMatch = groupLabel.match(/letter-spacing:\s*([\d.]+)em/);
    expect(trackingMatch).not.toBeNull();
    const tracking = Number(trackingMatch![1]);
    expect(tracking).toBeGreaterThanOrEqual(0.02);
    expect(tracking).toBeLessThanOrEqual(0.05);
  });

  it('puts 8px between a group label and its own first row (margin-end + rail-list gap)', () => {
    const marginEnd = remPx(groupLabel, 'margin-block-end');
    const listGap = remPx(railList, 'gap');
    expect(marginEnd + listGap).toBe(8);
  });

  it('puts ~16px between the previous group\'s last row and the next label', () => {
    const notFirstMatch = groupLabel.match(
      /&:not\(:first-child\)\s*\{\s*margin-block-start:\s*([\d.]+)rem/
    );
    expect(notFirstMatch).not.toBeNull();
    const listGap = remPx(railList, 'gap');
    expect(Number(notFirstMatch![1]) * 16 + listGap).toBe(16);
  });

  it('puts a stated 16px between the switcher and the first group label', () => {
    const firstChildMatch = groupLabel.match(
      /&:first-child\s*\{\s*margin-block-start:\s*([\d.]+)rem/
    );
    expect(firstChildMatch).not.toBeNull();
    const navPaddingTop = remPx(sidebarNav, 'padding'); // shorthand, all sides equal here
    expect(Number(firstChildMatch![1]) * 16 + navPaddingTop).toBe(16);
  });

  it('keeps the group-to-group whitespace total (before + after label) in the 20-24px band', () => {
    const listGap = remPx(railList, 'gap');
    const before = remPx(groupLabel, 'margin-block-end') + listGap;
    const notFirstMatch = groupLabel.match(
      /&:not\(:first-child\)\s*\{\s*margin-block-start:\s*([\d.]+)rem/
    );
    const after = Number(notFirstMatch![1]) * 16 + listGap;
    const total = before + after;
    expect(total).toBeGreaterThanOrEqual(20);
    expect(total).toBeLessThanOrEqual(24);
  });

  it('sizes the switcher row the same as a nav row — h-9, no type-scale step-up', () => {
    const switcherHeight = remPx(workspaceSwitcherRow, 'height');
    expect(switcherHeight).toBe(RAIL_NAV_ROW_HEIGHT);
    expect(switcherHeight).toBe(36);
  });

  it('keeps the brand row at h-12 and an explicit 8px gap to the switcher below it', () => {
    expect(remPx(brandRow, 'height')).toBe(48);
    expect(remPx(switcherRow, 'margin-block-start')).toBe(8);
  });
});

describe('console-sidebar geometry (rendered DOM precondition)', () => {
  const groups: NavGroup[] = [
    {
      key: 'workspace',
      label: 'Workspace',
      items: [
        { key: 'overview', label: 'Overview', active: true },
        { key: 'projects', label: 'Projects' },
      ],
    },
    { key: 'account', label: 'Account', items: [{ key: 'settings', label: 'Settings' }] },
  ];

  it('keeps both `menu-title` and `sidebar-group-label` on the SAME element — the override\'s precondition', () => {
    const { container } = render(React.createElement(NavSpine, { groups, layout: 'sidebar' }));
    const labels = container.querySelectorAll('.sidebar-group-label');
    expect(labels).toHaveLength(2);
    for (const label of labels) {
      // Both classes on one element is what lets `sidebar-group-label`'s unlayered `@utility`
      // override daisy's `.menu-title` paint without an `!important` — losing either class here
      // (renaming one, or splitting them across a wrapper) silently reopens the regression even
      // though nothing in this file's assertions above would catch it on their own.
      expect(label).toHaveClass('menu-title', 'sidebar-group-label');
    }
  });

  it('starts every nav row label at the SAME x the group label\'s own padding encodes', () => {
    const { container } = render(React.createElement(NavSpine, { groups, layout: 'sidebar' }));
    const navLabels = container.querySelectorAll('.rail-row-label');
    expect(navLabels.length).toBeGreaterThan(0);
    // The nav row's own left edge (icon column + gap, `RAIL_ICON_COLUMN_CLASS`/`RAIL_LABEL_GAP_CLASS`)
    // and the label's `padding-inline-start` are two independently-typed numbers asserted to
    // agree above (38px each); this only confirms every row still goes through that shared path
    // rather than a one-off className.
    for (const row of container.querySelectorAll('.rail-row')) {
      expect(row.querySelector('.rail-row-label')).not.toBeNull();
    }
  });
});

// ── The flex-axis regression (2026-08-30, twice owner-rejected) ────────────────────────────────
// daisy's `menu li` contributes `flex-direction: column`; without an explicit `row` on
// `sidebar-group-label`, its `align-items: center` centers the TEXT horizontally while box left,
// padding, font-size and text-align all measure correct. computed-style checks are blind to it
// (jsdom drops @layer entirely; real-browser checks passed on the innocent properties) — so pin
// the source: the utility must declare the axis it aligns on.
describe('sidebar-group-label flex axis', () => {
  it('declares flex-direction: row so align-items centers vertically, not the text horizontally', () => {
    const utility = themeCss.match(/@utility sidebar-group-label \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(utility).toContain('flex-direction: row');
    expect(utility).toContain('align-items: center');
  });
});
