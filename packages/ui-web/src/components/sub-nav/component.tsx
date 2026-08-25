import React from 'react';

import { cn } from '../../cn';
import type { SubNavItem, SubNavProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — same active treatment as `NavSpine`
// (`raised` fill + 2px `signal` left bar), rows 28px vs NavSpine's 34px. Counts sit inline as
// plain trailing text, never a badge.
//
// ADR 0010 Decision 4 (task assignment note): a route-navigation list (`href` links, like
// `NavSpine`), not a tab-panel switcher, so it takes daisy's `menu` rather than PRIMITIVES.md's
// general Base UI Tabs row — Tabs couples a trigger to a same-tree `Tabs.Panel`, which doesn't
// fit route links. `menu`'s `li > a/button` selector supplies row padding/radius for free; the
// active fill/bar stay explicit overrides since daisy's `menu-active` resolves to `chrome`, not
// our `raised` token.
const ROW_BASE_CLASS = cn(
  'relative flex h-7 items-center justify-between gap-2 font-mono text-xs',
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
      {item.active ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-primary" />
      ) : null}
      <span>{item.label}</span>
      {item.count !== undefined ? (
        <>
          {' '}
          <span className="text-[10px] text-subtle">{item.count}</span>
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
      <ul className="menu menu-sm w-full gap-1 p-0">
        {items.map((item) => (
          <SubNavRow key={item.key} item={item} />
        ))}
      </ul>
    </nav>
  );
}
