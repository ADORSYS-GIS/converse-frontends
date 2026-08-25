import React from 'react';

import { cn } from '../../cn';
import {
  RAIL_ACTIVE_BAR_CLASS,
  RAIL_ICON_COLUMN_CLASS,
  RAIL_LABEL_GAP_CLASS,
  RAIL_ROW_BLEED_CLASS,
  RAIL_ROW_PADDING_CLASS,
  RAIL_SUBNAV_ROW_HEIGHT_CLASS,
} from '../../lib/rail-grid';
import type { SubNavItem, SubNavProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — same active treatment as `NavSpine`
// (`raised` fill + 2px `signal` left bar), rows 28px vs NavSpine's 34px. Counts sit inline as
// plain trailing text, never a badge. Row bleed/padding/icon-column/gap/height all come from
// `../../lib/rail-grid` — the shared rail alignment grid `NavSpine` and `RailPanel`'s section
// label also build from (fix/ui-web-rail-alignment-grid: before this, `SubNav` had none of
// that and instead relied on daisyUI's default `menu` gutters, which is what let its rows,
// active bar, and text start at a different x than `NavSpine`'s).
//
// ADR 0010 Decision 4 (task assignment note): a route-navigation list (`href` links, like
// `NavSpine`), not a tab-panel switcher, so it takes daisy's `menu` rather than PRIMITIVES.md's
// general Base UI Tabs row — Tabs couples a trigger to a same-tree `Tabs.Panel`, which doesn't
// fit route links. `menu`'s radius/list semantics stay; its default row padding is explicitly
// overridden below (`RAIL_ROW_PADDING_CLASS`) so the row's own inset is grid-driven, not
// daisy's default — the active fill/bar stay explicit overrides since daisy's `menu-active`
// resolves to `chrome`, not our `raised` token.
const ROW_BASE_CLASS = cn(
  `relative flex ${RAIL_SUBNAV_ROW_HEIGHT_CLASS} items-center ${RAIL_LABEL_GAP_CLASS} ${RAIL_ROW_PADDING_CLASS} font-mono text-xs`,
  'transition-colors duration-150 ease-out',
  'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
);

function SubNavRow({ item }: { item: SubNavItem }) {
  const className = cn(
    ROW_BASE_CLASS,
    item.active ? 'bg-raised! text-ink!' : 'text-soft! hover:bg-chrome! hover:text-ink!',
  );
  const content = (
    <>
      {item.active ? <span aria-hidden="true" className={RAIL_ACTIVE_BAR_CLASS} /> : null}
      {/* Reserves the same width `NavSpine`'s icon column occupies, even though sub-nav rows
          never carry an icon — so the label below lands at the ONE shared label x every rail
          row/heading uses (rail-grid.ts rule 4), and sub-nav visibly nests under the nav
          spine's label column rather than its icon column. */}
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count !== undefined ? (
        <>
          {' '}
          <span className="shrink-0 text-[10px] text-subtle">{item.count}</span>
        </>
      ) : null}
    </>
  );

  return (
    <li>
      {item.href ? (
        <a
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={className}
          onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}>
          {content}
        </a>
      ) : (
        <button
          type="button"
          aria-current={item.active ? 'page' : undefined}
          className={className}
          onClick={() => item.onSelect?.(item.key)}>
          {content}
        </button>
      )}
    </li>
  );
}

export function SubNav({ items, className }: SubNavProps) {
  return (
    <nav aria-label="Section" className={className}>
      {/* `-mx-2` (`RAIL_ROW_BLEED_CLASS`) bleeds the list out of the enclosing `RailPanel`'s
          16px inset — the same bleed `NavSpine`'s `<nav>` applies — so this list's active
          fill/active bar land at the identical net inset from the rail's true left edge. */}
      <ul className={cn('menu menu-sm w-full gap-1 p-0', RAIL_ROW_BLEED_CLASS)}>
        {items.map((item) => (
          <SubNavRow key={item.key} item={item} />
        ))}
      </ul>
    </nav>
  );
}
