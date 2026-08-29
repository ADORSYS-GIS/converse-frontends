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
// sibling `SubNav` already uses. Before this, the two rail-navigation components were styled by
// two different mechanisms and `nav-spine` carried a `cva.ts` exporting two variant sets whose
// only axis was `active: true|false` — the console-ui skill's "Never do" list bans exactly that
// ("a `cva.ts` that only encodes boolean state") and its shrink policy says to delete it in
// favour of `data-*` variants. Hence: no `cva.ts`, active state expressed as `data-active` on the
// row element and read back by `data-[active=…]:` variants.
//
// daisy `menu` owns the list/row paint (`--radius-field`, the row grid, `menu-active`'s
// no-hover-override behaviour); the rail alignment grid still owns every offset. `menu`'s own
// gutters are neutralised explicitly (`p-0`, `w-auto`, `RAIL_ROW_PADDING_CLASS`) — letting daisy's
// defaults through is precisely how `SubNav`'s rows drifted out of alignment before
// `lib/rail-grid.ts` existed (fix/ui-web-rail-alignment-grid). `menu-active` is applied to the
// active row so daisy's own `:hover` rule (which excludes `.menu-active`) cannot repaint it; the
// fill/label colours themselves stay ours, since daisy's `--menu-active-bg` resolves to `neutral`
// (= `chrome`), not the `raised` token ADR 0008 specifies.
const ROW_BASE_CLASS = cn(
  'relative flex w-full items-center font-mono text-xs',
  RAIL_LABEL_GAP_CLASS,
  RAIL_ROW_PADDING_CLASS,
  'transition-colors duration-150 ease-out',
  'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface'
);

// Contract: docs/design/console-redesign/README.md §4 (shell) — active item = `raised` fill + the
// 2px `signal` left bar; mono 12px labels. Row height/padding/gap come from `lib/rail-grid.ts`.
const NAV_ROW_CLASS = cn(
  ROW_BASE_CLASS,
  RAIL_NAV_ROW_HEIGHT_CLASS,
  'data-[active=true]:bg-raised data-[active=true]:text-ink',
  'data-[active=false]:text-soft data-[active=false]:hover:bg-chrome data-[active=false]:hover:text-ink'
);

// `bottom-bar` layout (console-ui skill "Shape and layout" — the mobile-first <600 nav dock): a
// horizontal strip, icon above a 10px label, active = `primary` text + a 2px `signal` top bar (the
// rail's left bar rotated to the top edge, matching how the sheet direction rotates too).
const BOTTOM_BAR_ROW_CLASS = cn(
  'relative flex h-full w-full flex-col items-center justify-center gap-1 font-mono text-[10px]',
  'transition-colors duration-150 ease-out',
  'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset',
  'data-[active=true]:text-primary',
  'data-[active=false]:text-subtle data-[active=false]:hover:text-soft'
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
      rowClassName={BOTTOM_BAR_ROW_CLASS}
      liClassName="flex-1">
      {item.active ? (
        <span aria-hidden="true" className="bg-primary absolute inset-x-0 top-0 h-[2px]" />
      ) : null}
      {item.icon ? <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{item.icon}</span> : null}
      <span>{item.label}</span>
    </NavItemRow>
  );
}

// Contract: docs/design/console-redesign/README.md §3/§4 — the four fixed nav groups; Admin
// renders only with the `lightbridge-admin` grant, preceded by a `--raised` rule + `ROLE`
// marker (overview.svg), so a non-admin's shorter spine reads as complete, not missing. The
// marker row takes daisy's `menu-title`, which is how `menu` is told a row is NOT a nav row —
// its `li:not(.menu-title)` selectors then leave the rule and label alone.
//
// `layout="bottom-bar"` (console-ui skill "Shape and layout") swaps this to the mobile-first
// (<600) fixed bottom navigation dock: `menu menu-horizontal`, icon above label, active =
// `primary` text + a 2px top bar. The Admin item is appended plainly (still gated by `showAdmin`)
// — a rule + `ROLE` marker has no legible home in a 56px horizontal strip.
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
        <ul className="menu menu-horizontal menu-sm flex h-full w-full flex-nowrap items-stretch gap-0 p-0">
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
      {/* `w-auto`, not `w-full`: daisy `menu` ships `width: fit-content`, and `width: 100%`
          would resolve against the panel's 176px content box and then be SHIFTED left by the
          bleed, leaving the active fill 8px short of the rail's right edge while flush at the
          left. `auto` lets the used width absorb both negative margins, so the fill bleeds the
          same 8px at both ends — which is what `RAIL_ROW_BLEED` means. */}
      <ul className={cn('menu menu-sm w-auto gap-1 p-0', RAIL_ROW_BLEED_CLASS)}>
        {items.map((item) => (
          <NavRow key={item.key} item={item} linkComponent={linkComponent} />
        ))}
        {showAdmin && adminItems.length > 0 ? (
          <>
            <li className="menu-title mx-2 my-2 flex flex-row items-center justify-between gap-2 p-0">
              <span aria-hidden="true" className="bg-raised h-px flex-1" />
              <span className="text-subtle font-mono text-[9px] tracking-[.08em]">{roleLabel}</span>
            </li>
            {adminItems.map((item) => (
              <NavRow key={item.key} item={item} linkComponent={linkComponent} />
            ))}
          </>
        ) : null}
      </ul>
    </nav>
  );
}
