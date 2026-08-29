import { NavigationMenu } from '@base-ui/react/navigation-menu';
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

// PRIMITIVES.md row `nav-spine` — Base UI `@base-ui/react/navigation-menu` for behaviour, daisy
// `menu`/`menu-sm`/`menu-title` for paint, the SAME mechanism the sibling `SubNav` uses.
//
// WHY `@base-ui/react/navigation-menu` FITS, given it is usually described as a popup menu. Read
// from the shipped 1.7.0 source rather than the docs: the primitive is two halves, and only one of
// them is about popups. `Trigger`/`Content`/`Positioner`/`Popup`/`Viewport`/`Backdrop`/`Arrow` are
// the popup half and are entirely optional — omit them and `Root` never leaves `value === null`, so
// nothing mounts and no floating machinery runs. `Root`/`List`/`Item`/`Link` are the other half, and
// `NavigationMenuLink` is built for exactly our case: it takes an `active` boolean and emits
// `aria-current="page"` from it (`link/NavigationMenuLink.js`), which is the contract this
// component used to hand-write in two components that had already drifted apart in spelling.
//
// The one thing worth checking before adopting a Base UI list — whether its `CompositeRoot` would
// impose a roving tab stop and take Tab away from every destination but one — does NOT happen
// here, and not by accident: `NavigationMenuLink` sets `tabIndex: undefined` in the props it
// merges OVER `CompositeItem`'s `tabIndex: isHighlighted ? 0 : -1`, deliberately opting its links
// out of roving. Measured, not assumed: three links in a `List` render with no `tabindex`
// attribute at all, so every route stays a natural tab stop exactly as before. What the composite
// DOES add is orientation-aware arrow navigation between destinations — Up/Down in the vertical
// rail, Left/Right in the horizontal dock (where Up/Down pass straight through to page scroll),
// non-looping, because `NavigationMenuList` hard-codes `loopFocus: false`. That is behaviour this
// file had none of.
//
// Division of labour, so the next reader does not move a piece back:
//  - Base UI `@base-ui/react/navigation-menu` owns the `<nav>`/`<ul>`/`<li>`/`<a>` structure,
//    `aria-current`, and arrow navigation. It inserts NO wrapper element, and `List` puts no
//    attribute of its own on the `<ul>` — which is why the rail alignment grid below survives
//    the adoption untouched.
//  - daisy `menu` owns list semantics and the row radius.
//  - `theme.css`'s `rail-row` / `rail-list` / `rail-role-marker` own the paint and the states.
//  - `lib/rail-grid.ts` owns every x-offset and row height — it is a numeric model `RailPanel`
//    builds from too, so it stays in TypeScript rather than being half-restated in CSS.
//  - Active state is `aria-current="page"`, which `rail-row` reads, so there is no second parallel
//    flag. `menu-active` stays on the active row purely to keep daisy's own row-hover rule off it.
const NAV_ROW_CLASS = cn(
  'rail-row',
  RAIL_LABEL_GAP_CLASS,
  RAIL_ROW_PADDING_CLASS,
  RAIL_NAV_ROW_HEIGHT_CLASS,
  'focus-ring w-full'
);

// The row element itself is supplied through Base UI's `render` prop rather than chosen by
// `NavigationMenu.Link` (which would always be an `<a>`): an item with no `href` is a real
// `<button type="button">`, and an item with one goes through `linkComponent` so `apps/console`
// can hand us `next/link`. Children hang off the render element, not off `NavigationMenu.Link`,
// because `LinkComponentProps.children` is required — Base UI merges its own props (including the
// composite `ref` that registers the row for arrow navigation) into that element and leaves its
// children alone.
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
  const Link = linkComponent;

  return (
    <NavigationMenu.Item className={liClassName}>
      <NavigationMenu.Link
        active={active}
        className={className}
        onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}
        render={
          item.href ? (
            <Link href={item.href}>{children}</Link>
          ) : (
            <button type="button">{children}</button>
          )
        }
      />
    </NavigationMenu.Item>
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
// draws the hairline as a pseudo-element instead of a second `<span>`. It stays a plain `<li>`
// rather than a `NavigationMenu.Item`: it is a label, not a destination, and only
// `CompositeItem`-registered rows join the arrow-key ring, so a plain `<li>` is correctly skipped.
//
// `layout="bottom-bar"` (console-ui skill "Shape and layout") swaps this to the mobile-first
// (<600) fixed bottom navigation dock: `menu menu-horizontal` + `nav-dock`, icon above label,
// active = `primary` text and a 2px top bar (drawn by `nav-dock-row`, not by a rendered node).
// The Admin item is appended plainly (still gated by `showAdmin`) — a rule and a `ROLE` marker
// have no legible home in a 56px horizontal strip. `orientation` follows the layout, so the dock
// answers to Left/Right and leaves Up/Down to the page, while the rail does the reverse.
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
      <NavigationMenu.Root
        orientation="horizontal"
        aria-label="Primary"
        className={cn('h-full w-full', className)}>
        <NavigationMenu.List className="menu menu-horizontal menu-sm nav-dock">
          {allItems.map((item) => (
            <BottomBarRow key={item.key} item={item} linkComponent={linkComponent} />
          ))}
        </NavigationMenu.List>
      </NavigationMenu.Root>
    );
  }

  return (
    <NavigationMenu.Root orientation="vertical" aria-label="Primary" className={className}>
      {/* `-mx-2` (`RAIL_ROW_BLEED_CLASS`) bleeds the list out of the enclosing `RailPanel`'s 16px
          inset — the same bleed `SubNav`'s `<ul>` applies — so both lists' active fill/active bar
          land at the identical net inset from the rail's true left edge. */}
      {/* `w-auto`, not `w-full`: daisy `menu` ships a fit-content width, and a 100% width would
          resolve against the panel's 176px content box and then be SHIFTED left by the bleed,
          leaving the active fill 8px short of the rail's right edge while flush at the left.
          `auto` lets the used width absorb both negative margins, so the fill bleeds the same 8px
          at both ends — which is what `RAIL_ROW_BLEED` means. */}
      <NavigationMenu.List className={cn('menu menu-sm rail-list w-auto', RAIL_ROW_BLEED_CLASS)}>
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
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
