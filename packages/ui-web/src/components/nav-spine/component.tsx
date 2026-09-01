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
  RAIL_ROW_PADDING_CLASS,
} from '../../lib/rail-grid';
import { Tooltip } from '../tooltip';
import type { TooltipSide } from '../tooltip';
import type { NavGroup, NavSpineItem, NavSpineProps } from './types';

// Shell brief (2026-08-30) — `NavSpine` now renders GROUPS, not a flat item list plus a bolted-on
// `adminItems`/`showAdmin` axis. The `rail` layout name is retired in favour of `sidebar`, which
// is what it actually renders now (`ConsoleSidebar`'s nav list, not a `RailPanel` — that component
// is gone). Base UI `@base-ui/react/navigation-menu` still owns the structure and behaviour; see
// the adoption note this file used to carry in full — unchanged by the rewrite:
//
//  - `Root`/`List`/`Item`/`Link` model a destination list, not a popup menu (the popup half —
//    `Trigger`/`Content`/`Positioner`/`Popup`/`Viewport` — is simply never rendered).
//  - `NavigationMenuLink`'s `active` prop emits `aria-current="page"`.
//  - `NavigationMenuLink` merges `tabIndex: undefined` OVER `CompositeItem`'s roving `-1`, so the
//    composite root does NOT collapse rows to a single tab stop — every destination keeps its own
//    natural tab stop, verified by rendering three links in a `List` with no `tabindex` attribute
//    at all. What the composite DOES add is orientation-aware, non-looping arrow navigation
//    between rows (`NavigationMenuList` hard-codes `loopFocus: false`).
//
// Division of labour: Base UI owns the `<nav>`/`<ul>`/`<li>`/`<a>` structure, `aria-current`, and
// arrow navigation; daisy `menu` owns list semantics and row radius; `theme.css`'s `rail-row` /
// `rail-list` / `sidebar-group-label` / `nav-dock` / `nav-dock-row` own the paint; `lib/rail-grid.ts`
// owns every row x-offset and height.
const NAV_ROW_CLASS = cn(
  'rail-row focus-ring',
  RAIL_LABEL_GAP_CLASS,
  RAIL_ROW_PADDING_CLASS,
  RAIL_NAV_ROW_HEIGHT_CLASS
);

// The row element itself is supplied through Base UI's `render` prop rather than chosen by
// `NavigationMenu.Link` (which would always be an `<a>`): an item with no `href` is a real
// `<button type="button">`, and an item with one goes through `linkComponent` so `apps/console`
// can hand us `next/link`. Children hang off the render element, not off `NavigationMenu.Link`,
// because `LinkComponentProps.children` is required — Base UI merges its own props (including the
// composite `ref` that registers the row for arrow navigation) into that element and leaves its
// children alone.
//
// Owner finding, 2026-08-31 (issue #368): "I have the role lightbridge-admin and yet I can't see
// roles" — the Roles row WAS there, `disabled` with a `title` carrying the honest reason, but a
// native `disabled` button does not reliably fire the hover/focus events a tooltip (or the
// browser's own `title`) needs — Firefox never dispatches pointer events to a disabled control at
// all, and even where it does, `title`'s ~1.5s delay and tiny grey text is easy to miss outright.
// So a disabled item is now `aria-disabled="true"` on a REAL, focusable, hoverable button —
// the same pattern `Button`'s own `focusableWhenDisabled` already uses for exactly this reason —
// and skips `NavigationMenu.Link`/`NavigationMenu.Item` entirely rather than trying to nest this
// package's own `Tooltip` (which owns its trigger's props outright, not by forwarding an unknown
// prop set) inside another `render` slot that ALSO wants to own them. The row is never navigable
// either way (no `href`, no `onSelect` fires), so the only things skipped are `aria-current`
// (never true here — no route ever matches a disabled item) and composite arrow-key registration
// (Tab order is unaffected: every row keeps its own natural tab stop regardless, per the note
// above).
function NavItemRow({
  item,
  linkComponent,
  rowClassName,
  tooltipSide,
  children,
}: {
  item: NavSpineItem;
  linkComponent: LinkComponent;
  rowClassName: string;
  /** Side the reason tooltip opens on. Omit to skip the tooltip entirely (the bottom-bar dock:
   *  no room for a hover popup on a touch-first 56px strip — see `BottomBarRow`). */
  tooltipSide?: TooltipSide;
  children: React.ReactNode;
}) {
  const active = Boolean(item.active);
  const Link = linkComponent;

  if (item.disabled) {
    const button = (
      <button type="button" aria-disabled="true" className={rowClassName}>
        {children}
      </button>
    );
    return (
      <li>
        {item.reason && tooltipSide ? (
          <Tooltip content={item.reason} side={tooltipSide}>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </li>
    );
  }

  const render = item.href ? (
    <Link href={item.href}>{children}</Link>
  ) : (
    <button type="button">{children}</button>
  );

  return (
    <NavigationMenu.Item>
      <NavigationMenu.Link
        active={active}
        className={rowClassName}
        onClick={!item.onSelect ? undefined : () => item.onSelect?.(item.key)}
        render={render}
      />
    </NavigationMenu.Item>
  );
}

function NavRow({ item, linkComponent }: { item: NavSpineItem; linkComponent: LinkComponent }) {
  return (
    <NavItemRow
      item={item}
      linkComponent={linkComponent}
      rowClassName={NAV_ROW_CLASS}
      tooltipSide="right">
      {item.active ? <span aria-hidden="true" className={RAIL_ACTIVE_BAR_CLASS} /> : null}
      {/* Fixed-width icon column (rail-grid.ts) — reserved even when `item.icon` is absent, so
          a mix of icon/no-icon nav items never shifts where labels start. */}
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
        {item.icon}
      </span>
      {/* The label stays at its normal position (owner finding, 2026-08-31 — a disabled row must
          "clearly read as a present-but-unavailable destination", not shrink or move to make
          room for the annotation). */}
      <span className="rail-row-label">{item.label}</span>
      {/* Plain trailing text, never a badge (console-ui skill) — same `rail-row-count` treatment
          `SubNav`'s own per-section counts use, reused rather than a second near-identical class:
          "Unavailable" is the same KIND of thing a count is, a small trailing marker, just text
          instead of a number. Takes priority over `count` (a disabled item never carries one in
          practice) so the always-visible half of the fix does not depend on the tooltip firing at
          all. */}
      {item.disabled ? (
        <span className="rail-row-count">Unavailable</span>
      ) : item.count !== undefined ? (
        <span className="rail-row-count">{item.count}</span>
      ) : null}
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
    <NavItemRow item={item} linkComponent={linkComponent} rowClassName="nav-dock-row">
      {item.icon ? <span>{item.icon}</span> : null}
      <span>{item.label}</span>
    </NavItemRow>
  );
}

// `layout="sidebar"` renders every group in order: an optional `sidebar-group-label` heading
// (daisy `menu-title`, so `menu`'s own `li:not(.menu-title)` selectors leave it alone), then that
// group's rows. A group with no `label` renders no heading at all — there is no longer a special
// "Admin group gets a marker" case; every group is the same shape, gated or not by whether the
// caller includes it in `groups`.
function SidebarGroup({ group, linkComponent }: { group: NavGroup; linkComponent: LinkComponent }) {
  return (
    <>
      {group.label ? <li className="menu-title sidebar-group-label">{group.label}</li> : null}
      {group.items.map((item) => (
        <NavRow key={item.key} item={item} linkComponent={linkComponent} />
      ))}
    </>
  );
}

export function NavSpine({
  groups,
  layout,
  className,
  linkComponent = DefaultAnchor,
}: NavSpineProps) {
  if (layout === 'bottom-bar') {
    const allItems = groups.flatMap((group) => group.items);
    return (
      <NavigationMenu.Root
        orientation="horizontal"
        aria-label="Primary"
        className={cn('nav-dock', className)}>
        <NavigationMenu.List className="menu menu-horizontal menu-sm">
          {allItems.map((item) => (
            <BottomBarRow key={item.key} item={item} linkComponent={linkComponent} />
          ))}
        </NavigationMenu.List>
      </NavigationMenu.Root>
    );
  }

  return (
    <NavigationMenu.Root orientation="vertical" aria-label="Primary" className={className}>
      <NavigationMenu.List className="menu menu-sm rail-list">
        {groups.map((group) => (
          <SidebarGroup key={group.key} group={group} linkComponent={linkComponent} />
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
