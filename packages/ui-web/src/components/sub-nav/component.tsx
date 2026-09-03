import { NavigationMenu } from '@base-ui/react/navigation-menu';
import React from 'react';

import { cn } from '../../cn';
import { DefaultAnchor } from '../../lib/link-component';
import type { LinkComponent } from '../../lib/link-component';
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
// Base UI `@base-ui/react/navigation-menu`, byte-for-byte the same adoption `NavSpine` makes — see
// the long note at the top of `../nav-spine/component.tsx` for why a primitive usually described
// as a popup menu is the right one for a list of route links, and for the measured proof that its
// `CompositeRoot` does NOT take the rows out of the tab order. Two components spelling one
// contract two ways is exactly the thing the shared row class was introduced to end; the behaviour
// half now matches too.
//
// The ADR 0010 Decision 4 note this file used to carry still stands and is untouched by the
// adoption: this is a route-navigation list, not a tab-panel switcher, so Base UI `Tabs` remains
// wrong for it — `Tabs` couples a trigger to a same-tree `Tabs.Panel`, which route links have no
// equivalent of. The primitive adopted here models a DESTINATION rather than a panel, which is why
// its `Link` ships an `active` prop that emits `aria-current="page"`.
//
// The paint is `theme.css`'s `rail-row`, byte-identical to `NavSpine`'s, which is the contract.
// The five `!important` overrides that used to hang off this row are gone: an `@utility` lands
// unlayered inside `utilities` while daisy emits into a sublayer of it, so it beats `menu` on the
// cascade rather than on `!`. Active state is read off the `aria-current="page"` Base UI sets from
// the `active` prop — there is no second flag to keep in step, and the daisy `menu-active` both
// rails used to add alongside it is gone for the same cascade reason: it existed only to exclude
// the active row from daisy's row-hover rule, which `rail-row` already outranks by layer.
const ROW_BASE_CLASS = cn(
  'rail-row focus-ring',
  RAIL_SUBNAV_ROW_HEIGHT_CLASS,
  RAIL_LABEL_GAP_CLASS,
  RAIL_ROW_PADDING_CLASS
);

function SubNavRow({
  item,
  linkComponent,
  horizontal,
}: {
  item: SubNavItem;
  linkComponent: LinkComponent;
  horizontal: boolean;
}) {
  const Link = linkComponent;
  const content = horizontal ? (
    <>
      {item.label}
      {/* A trailing numeral, styled — not bare concatenation (phase 9, owner: the "Projects 2"
          stutter). The same `rail-row-count` treatment the vertical rail's own counts use: one
          step back on the ramp, never a badge (console-ui skill). The VISUAL gap is
          `rail-row-count`'s own `margin-left` (theme.css) — the original fix relied on this
          `{' '}` text node alone for spacing, which at 13px sans renders under 4px wide, visually
          indistinguishable from no gap (the defect this still-live-on-prod nit is about). The
          `{' '}` stays for the accessible name ("Projects 24", not "Projects24") — it costs
          nothing visually because `sub-nav-tab`/`rail-row` are flex containers, and a
          whitespace-only text node next to flex items generates no box (CSS Flexbox §"Absolutely
          Positioned Flex Children" / anonymous-flex-item rules). */}
      {item.count !== undefined ? (
        <>
          {' '}
          <span className="rail-row-count">{item.count}</span>
        </>
      ) : null}
    </>
  ) : (
    <>
      {item.active ? <span aria-hidden="true" className={RAIL_ACTIVE_BAR_CLASS} /> : null}
      {/* Reserves the same width `NavSpine`'s icon column occupies, even though sub-nav rows
          never carry an icon — so the label below lands at the ONE shared label x every rail
          row/heading uses (rail-grid.ts rule 4), and sub-nav visibly nests under the nav
          spine's label column rather than its icon column. */}
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
      <span className="rail-row-label">{item.label}</span>
      {item.count !== undefined ? (
        <>
          {' '}
          <span className="rail-row-count">{item.count}</span>
        </>
      ) : null}
    </>
  );

  // Same `render` seam as `NavSpine`: the row element is a `<button>` or the caller's
  // `linkComponent`, never Base UI's own bare `<a>`, and the children hang off that element.
  return (
    <NavigationMenu.Item>
      <NavigationMenu.Link
        active={Boolean(item.active)}
        className={horizontal ? 'sub-nav-tab focus-ring' : ROW_BASE_CLASS}
        onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}
        render={
          item.href ? (
            <Link href={item.href}>{content}</Link>
          ) : (
            <button type="button">{content}</button>
          )
        }
      />
    </NavigationMenu.Item>
  );
}

export function SubNav({
  items,
  className,
  linkComponent = DefaultAnchor,
  orientation = 'vertical',
}: SubNavProps) {
  const horizontal = orientation === 'horizontal';
  return (
    <NavigationMenu.Root
      orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-label="Section"
      className={className}>
      {/* `-mx-2` (`RAIL_ROW_BLEED_CLASS`) bleeds the VERTICAL list out of the enclosing
          `RailPanel`'s 16px inset — the same bleed `NavSpine`'s `<ul>` applies — so this list's
          active fill/active bar land at the identical net inset from the rail's true left edge.
          The width that makes the bleed symmetric is `rail-list`'s; the `w-full` that used to sit
          here fought it, resolving 100% against the panel and then shifting left by the bleed.
          The HORIZONTAL list is not a rail at all — no bleed, no daisy `menu` paint, just
          `sub-nav-tabs`'s row of cells (theme.css). */}
      <NavigationMenu.List
        className={
          horizontal ? 'sub-nav-tabs' : cn('menu menu-sm rail-list', RAIL_ROW_BLEED_CLASS)
        }>
        {items.map((item) => (
          <SubNavRow
            key={item.key}
            item={item}
            linkComponent={linkComponent}
            horizontal={horizontal}
          />
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
