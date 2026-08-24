import React from 'react';

import { cn } from '../../cn';
import { navBottomBarItemVariants, navSpineItemVariants } from './cva';
import type { NavSpineItem, NavSpineProps } from './types';

function NavRow({ item }: { item: NavSpineItem }) {
  const className = cn(navSpineItemVariants({ active: item.active }));
  const content = (
    <>
      {item.active ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-primary" />
      ) : null}
      {item.icon}
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
        className={className}
        onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}
      >
        {content}
      </a>
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

function BottomBarRow({ item }: { item: NavSpineItem }) {
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
    return (
      <a
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
        className={className}
        onClick={item.onSelect ? () => item.onSelect?.(item.key) : undefined}
      >
        {content}
      </a>
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
}: NavSpineProps) {
  if (layout === 'bottom-bar') {
    const allItems = showAdmin ? [...items, ...adminItems] : items;
    return (
      <nav className={cn('flex h-full items-stretch', className)} aria-label="Primary">
        {allItems.map((item) => (
          <BottomBarRow key={item.key} item={item} />
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn('-mx-2 flex flex-col gap-1', className)} aria-label="Primary">
      {items.map((item) => (
        <NavRow key={item.key} item={item} />
      ))}
      {showAdmin && adminItems.length > 0 ? (
        <>
          <div className="mx-2 my-2 flex items-center justify-between gap-2">
            <span aria-hidden="true" className="h-px flex-1 bg-raised" />
            <span className="font-mono text-[9px] tracking-[.08em] text-subtle">{roleLabel}</span>
          </div>
          {adminItems.map((item) => (
            <NavRow key={item.key} item={item} />
          ))}
        </>
      ) : null}
    </nav>
  );
}
