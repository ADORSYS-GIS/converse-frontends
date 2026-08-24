import React from 'react';

import { cn } from '../../cn';
import { subNavItemVariants } from './cva';
import type { SubNavItem, SubNavProps } from './types';

function SubNavRow({ item }: { item: SubNavItem }) {
  const className = cn(subNavItemVariants({ active: item.active }));
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

// Contract: docs/design/console-redesign/README.md §4 — section sub-nav for Manage/Admin
// screens; a flat list, active state matches NavSpine, counts sit inline in the row as plain
// text (manage-projects.svg), never a badge component.
export function SubNav({ items, className }: SubNavProps) {
  return (
    <nav className={cn('-mx-2 flex flex-col gap-1', className)} aria-label="Section">
      {items.map((item) => (
        <SubNavRow key={item.key} item={item} />
      ))}
    </nav>
  );
}
