import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  RAIL_ICON_COLUMN_WIDTH,
  RAIL_LABEL_GAP,
  RAIL_NAV_ROW_HEIGHT,
  RAIL_ROW_PADDING_X,
} from '@lightbridge/ui-web/src/lib/rail-grid';

import { BackToConsoleRow } from './console-chrome';

/**
 * Owner review round 2 (2026-08-31, converse-frontends#368 finding #2, verbatim): "'Back to
 * console' is coupled to the arrow left icon. It should have the same distance as the other menu
 * items. I mean, technically it's also a menu item right?" — `BackToConsoleRow` (rendered for both
 * `/settings/*` and `/admin/*`, `ConsoleSidebarContent`'s own doc comment — same component, one
 * fix covers both areas) used to glue a literal "←" onto the front of its label text inside a
 * single-child `sidebar-footer-row`, so nothing reserved the icon column every nav row below it
 * uses and the label started flush at the row's own 12px padding rather than the shared 38px
 * label x.
 *
 * Two halves, matching `console-sidebar/geometry.test.ts`'s own split for the identical reason
 * (jsdom drops `@layer` entirely, so a computed-style check against the real compiled cascade
 * would silently test jsdom's blind spot, not this row): a rendered-DOM precondition check below,
 * and a source-pinned cross-check here against `theme.css`'s own `sidebar-footer-row` utility body
 * — the SAME numbers `NAV_ROW_CLASS`'s `RAIL_LABEL_GAP_CLASS`/`RAIL_ROW_PADDING_CLASS`/
 * `RAIL_NAV_ROW_HEIGHT_CLASS` (`nav-spine/component.tsx`) resolve to, proving this row's geometry
 * agrees with the nav rows underneath it rather than merely looking similar.
 */
const THEME_CSS_PATH = join(import.meta.dirname, '../../../../packages/ui-web/src/theme.css');
const themeCss = readFileSync(THEME_CSS_PATH, 'utf8');

/** Pulls the body of one `@utility <name> { ... }` block out of `theme.css` by brace counting —
 *  same helper `console-sidebar/geometry.test.ts` uses, re-implemented here rather than imported
 *  since that file is a test module, not a shared one. */
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

describe('BackToConsoleRow geometry (theme.css cross-check)', () => {
  const footerRow = utilityBody(themeCss, 'sidebar-footer-row');

  it('sizes the row at the same 36px height every nav row below it uses (RAIL_NAV_ROW_HEIGHT)', () => {
    expect(remPx(footerRow, 'height')).toBe(RAIL_NAV_ROW_HEIGHT);
    expect(remPx(footerRow, 'height')).toBe(36);
  });

  it('gaps the icon column from the label by the same 10px every nav row uses (RAIL_LABEL_GAP)', () => {
    expect(remPx(footerRow, 'gap')).toBe(RAIL_LABEL_GAP);
    expect(remPx(footerRow, 'gap')).toBe(10);
  });

  it('pads the row at the same 12px every nav row uses (RAIL_ROW_PADDING_X)', () => {
    expect(remPx(footerRow, 'padding-inline')).toBe(RAIL_ROW_PADDING_X);
    expect(remPx(footerRow, 'padding-inline')).toBe(12);
  });

  it('derives the shared 38px label x from padding + icon column + gap, the same sum every nav row resolves to', () => {
    const labelX =
      remPx(footerRow, 'padding-inline') + RAIL_ICON_COLUMN_WIDTH + remPx(footerRow, 'gap');
    expect(labelX).toBe(38);
  });
});

describe('BackToConsoleRow (rendered DOM precondition)', () => {
  it('reserves the shared icon column ahead of the label, instead of gluing an arrow onto the text', () => {
    const { container } = render(<BackToConsoleRow accountId="acct_1" />);

    const iconColumn = container.querySelector('.w-4.shrink-0');
    expect(iconColumn).not.toBeNull();
    expect(iconColumn).toHaveAttribute('aria-hidden', 'true');
    expect(iconColumn?.querySelector('svg')).not.toBeNull();
  });

  it('renders the label as plain text, with no literal arrow character glued onto it', () => {
    render(<BackToConsoleRow accountId="acct_1" />);

    expect(screen.getByText('Back to console')).toBeInTheDocument();
    expect(screen.queryByText('← Back to console')).not.toBeInTheDocument();
  });

  it('still links to the account overview it always has', () => {
    render(<BackToConsoleRow accountId="acct_1" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/accounts/acct_1/overview');
  });
});
