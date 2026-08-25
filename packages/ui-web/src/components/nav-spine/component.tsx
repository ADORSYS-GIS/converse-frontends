import React from 'react';

import { cn } from '../../cn';
import { DefaultAnchor } from '../../lib/link-component';
import type { LinkComponent } from '../../lib/link-component';
import { RAIL_ACTIVE_BAR_CLASS, RAIL_ICON_COLUMN_CLASS, RAIL_ROW_BLEED_CLASS } from '../../lib/rail-grid';
import { navBottomBarItemVariants, navSpineItemVariants } from './cva';
import type { NavSpineItem, NavSpineProps } from './types';

function NavRow({ item, linkComponent }: { item: NavSpineItem; linkComponent: LinkComponent }) {
  const className = cn(navSpineItemVariants({ active: item.active }));
  const content = (
    <>
      {item.active ? <span aria-hidden="true" className={RAIL_ACTIVE_BAR_CLASS} /> : null}
      {/* Fixed-width icon column (rail-grid.ts) — reserved even when `item.icon` is absent, so
          a mix of icon/no-icon nav items never shifts where labels start. */}
      <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    const Link = linkComponent;
    return (
      <Link
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
        className={className}
        onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-current={item.active ? 'page' : undefined}
      className={className}
      onClick={() => item.onSelect?.(item.key)}
    >
      {content}
    </button>
  );
}

function BottomBarRow({ item, linkComponent }: { item: NavSpineItem; linkComponent: LinkComponent }) {
  const className = cn(navBottomBarItemVariants({ active: item.active }));
  const content = (
    <>
      {item.active ? (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-primary" />
      ) : null}
      {item.icon ? <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{item.icon}</span> : null}
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    const Link = linkComponent;
    return (
      <Link
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
        className={className}
        onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-current={item.active ? 'page' : undefined}
      className={className}
      onClick={() => item.onSelect?.(item.key)}
    >
      {content}
    </button>
  );
}

// Contract: docs/design/console-redesign/README.md §3/§4 — the four fixed nav groups; Admin
// renders only with the `lightbridge-admin` grant, preceded by a `--raised` rule + `ROLE`
// marker (overview.svg), so a non-admin's shorter spine reads as complete, not missing.
//
// `layout="bottom-bar"` (console-ui skill "Shape and layout") swaps this to the mobile-first
// (<600) fixed bottom navigation dock: a horizontal row, icon above label, active = `primary`
// text + a 2px top bar. The Admin item is appended plainly (still gated by `showAdmin`) — a
// rule + `ROLE` marker has no legible home in a 56px horizontal strip.
export function NavSpine({
  items,
  adminItems = [],
  showAdmin = false,
  roleLabel = 'ROLE',
  layout = 'rail',
  className,
  linkComponent = DefaultAnchor,
}: NavSpineProps) {
  if (layout === 'bottom-bar') {
    const allItems = showAdmin ? [...items, ...adminItems] : items;
    return (
      <nav className={cn('flex h-full items-stretch', className)} aria-label="Primary">
        {allItems.map((item) => (
          <BottomBarRow key={item.key} item={item} linkComponent={linkComponent} />
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn(RAIL_ROW_BLEED_CLASS, 'flex flex-col gap-1', className)} aria-label="Primary">
      {items.map((item) => (
        <NavRow key={item.key} item={item} linkComponent={linkComponent} />
      ))}
      {showAdmin && adminItems.length > 0 ? (
        <>
          <div className="mx-2 my-2 flex items-center justify-between gap-2">
            <span aria-hidden="true" className="h-px flex-1 bg-raised" />
            <span className="font-mono text-[9px] tracking-[.08em] text-subtle">{roleLabel}</span>
          </div>
          {adminItems.map((item) => (
            <NavRow key={item.key} item={item} linkComponent={linkComponent} />
          ))}
        </>
      ) : null}
    </nav>
  );
}
