import React from 'react';

import { cn } from '../../cn';
import { SKELETON_BLOCK_WIDTHS, skeletonRowVariants } from './cva';
import type { SkeletonRowProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — `--raised` block matching
// the final geometry of a table row exactly. No shimmer, no spinner. Used standalone (any list)
// or composed by LedgerTable's loading state, aligned via `gridTemplateColumns`.
export function SkeletonRow({
  columnCount = 4,
  gridTemplateColumns,
  density,
  className,
}: SkeletonRowProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(skeletonRowVariants({ density }), className)}
      style={{
        gridTemplateColumns: gridTemplateColumns ?? `repeat(${columnCount}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: columnCount }, (_, index) => (
        <span
          key={index}
          className="h-3 rounded-[2px] bg-raised"
          style={{ width: SKELETON_BLOCK_WIDTHS[index % SKELETON_BLOCK_WIDTHS.length] }}
        />
      ))}
    </div>
  );
}
