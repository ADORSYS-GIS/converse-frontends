import React from 'react';

import { cn } from '../../cn';
import { DefaultAnchor } from '../../lib/link-component';
import type { LinkComponent } from '../../lib/link-component';
import {
  RAIL_ACTIVE_BAR_CLASS,
  RAIL_ICON_COLUMN_CLASS,
  RAIL_LABEL_GAP_CLASS,
  RAIL_NAV_ROW_HEIGHT_CLASS,
  RAIL_ROW_BLEED_CLASS,
  RAIL_ROW_PADDING_CLASS,
} from '../../lib/rail-grid';
import type { NavSpineItem, NavSpineProps } from './types';

// PRIMITIVES.md row `nav-spine` — daisy `menu` / `menu-sm` / `menu-title`, the SAME mechanism the
// sibling `SubNav` uses, and now the same PAINT: both rows are `rail-row` from `theme.css`, which
// is where the console's own component classes live. Adopting `menu` alone made this file WORSE
// (57 hand-written utilities to 82) for the reason that section records: every place the console
// disagrees with daisy's defaults cost an override at the call site. Declared once as CSS, the
// disagreements cost nothing here.
//
// Division of labour, so the next reader does not move a piece back:
//  - daisy `menu` owns list semantics and the row radius.
//  - `theme.css`'s `rail-row` / `rail-list` / `rail-role-marker` own the paint and the states.
//  - `lib/rail-grid.ts` owns every x-offset and row height — it is a numeric model `RailPanel`
//    builds from too, so it stays in TypeScript rather than being half-restated in CSS.
//  - Active state is `aria-current="page"`, which this component already set and which `rail-row`
//    now reads, so there is no second parallel flag. `menu-active` stays on the active row purely
//    to keep daisy's own row-hover rule off it.
const NAV_ROW_CLASS = cn(
  'rail-row',
  RAIL_LABEL_GAP_CLASS,
  RAIL_ROW_PADDING_CLASS,
  RAIL_NAV_ROW_HEIGHT_CLASS,
  'focus-ring w-full'
);

function NavItemRow({
  item,
  linkComponent,
  rowClassName,
  liClassName,
  children,
}: {
  item: NavSpineItem;
  linkComponent: LinkComponent;
  rowClassName: string;
  liClassName?: string;
  children: React.ReactNode;
}) {
  const active = Boolean(item.active);
  // `menu-active` keeps daisy's `menu` hover rule off the active row; the actual fill is ours.
  const className = cn(rowClassName, active && 'menu-active');
  const shared = {
    'data-active': active ? 'true' : 'false',
    'aria-current': active ? ('page' as const) : undefined,
    className,
  };

  if (item.href) {
    const Link = linkComponent;
    return (
      <li className={liClassName}>
        <Link
          {...shared}
          href={item.href}
          onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}>
          {children}
        </Link>
      </li>
    );
  }

  return (
    <li className={liClassName}>
      <button {...shared} type="button" onClick={() => item.onSelect?.(item.key)}>
        {children}
      </button>
    </li>
  );
}

function NavRow({ item, linkComponent }: { item: NavSpineItem; linkComponent: LinkComponent }) {
  return (
    <NavItemRow item={item} linkComponent={linkComponent} rowClassName={NAV_ROW_CLASS}>
      {item.active ? <span aria-hidden="true" className={RAIL_ACTIVE_BAR_CLASS} /> : null}
      {/* Fixed-width icon column (rail-grid.ts) — reserved even when `item.icon` is absent, so
          a mix of icon/no-icon nav items never shifts where labels start. */}
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </NavItemRow>
  );
}

function BottomBarRow({
  item,
  linkComponent,
}: {
  item: NavSpineItem;
  linkComponent: LinkComponent;
}) {
  return (
    <NavItemRow
      item={item}
      linkComponent={linkComponent}
      rowClassName="nav-dock-row"
      liClassName="flex-1">
      {item.icon ? <span>{item.icon}</span> : null}
      <span>{item.label}</span>
    </NavItemRow>
  );
}

// Contract: docs/design/console-redesign/README.md §3/§4 — the four fixed nav groups; Admin
// renders only with the `lightbridge-admin` grant, preceded by a `--raised` rule + `ROLE`
// marker (overview.svg), so a non-admin's shorter spine reads as complete, not missing. The
// marker row takes daisy's `menu-title`, which is how `menu` is told a row is NOT a nav row —
// its own no-title selectors then leave the rule and label alone — plus `rail-role-marker`, which
// draws the hairline as a pseudo-element instead of a second `<span>`.
//
// `layout="bottom-bar"` (console-ui skill "Shape and layout") swaps this to the mobile-first
// (<600) fixed bottom navigation dock: `menu menu-horizontal` + `nav-dock`, icon above label,
// active = `primary` text and a 2px top bar (drawn by `nav-dock-row`, not by a rendered node).
// The Admin item is appended plainly (still gated by `showAdmin`) — a rule and a `ROLE` marker
// have no legible home in a 56px horizontal strip.
export function NavSpine({
  items,
  adminItems = [],
  showAdmin = false,
  roleLabel = 'Role',
  layout = 'rail',
  className,
  linkComponent = DefaultAnchor,
}: NavSpineProps) {
  if (layout === 'bottom-bar') {
    const allItems = showAdmin ? [...items, ...adminItems] : items;
    return (
      <nav className={cn('h-full w-full', className)} aria-label="Primary">
        <ul className="menu menu-horizontal menu-sm nav-dock">
          {allItems.map((item) => (
            <BottomBarRow key={item.key} item={item} linkComponent={linkComponent} />
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className={className} aria-label="Primary">
      {/* `-mx-2` (`RAIL_ROW_BLEED_CLASS`) bleeds the list out of the enclosing `RailPanel`'s 16px
          inset — the same bleed `SubNav`'s `<ul>` applies — so both lists' active fill/active bar
          land at the identical net inset from the rail's true left edge. */}
      {/* `w-auto`, not `w-full`: daisy `menu` ships a fit-content width, and a 100% width would
          resolve against the panel's 176px content box and then be SHIFTED left by the bleed,
          leaving the active fill 8px short of the rail's right edge while flush at the left.
          `auto` lets the used width absorb both negative margins, so the fill bleeds the same 8px
          at both ends — which is what `RAIL_ROW_BLEED` means. */}
      <ul className={cn('menu menu-sm rail-list w-auto', RAIL_ROW_BLEED_CLASS)}>
        {items.map((item) => (
          <NavRow key={item.key} item={item} linkComponent={linkComponent} />
        ))}
        {showAdmin && adminItems.length > 0 ? (
          <>
            <li className="menu-title rail-role-marker">{roleLabel}</li>
            {adminItems.map((item) => (
              <NavRow key={item.key} item={item} linkComponent={linkComponent} />
            ))}
          </>
        ) : null}
      </ul>
    </nav>
  );
}
