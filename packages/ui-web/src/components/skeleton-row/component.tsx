import React from 'react';

import { cn } from '../../cn';
import { SKELETON_BLOCK_WIDTHS, skeletonRowVariants } from './cva';
import type { SkeletonRowProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — `--raised` block matching
// the final geometry of a table row exactly. No shimmer, no spinner. Used standalone (any list)
// or composed by LedgerTable's loading state, aligned via `gridTemplateColumns`.
//
// PRIMITIVE-MATRIX row 24: the blocks wear daisy's `skeleton`, which already resolves to
// `--color-base-300` (`raised`) at `--radius-box` (2px) — exactly what the hand-written
// `bg-raised rounded-[2px]` pair spelled out. daisy's own shimmer is suppressed ONCE, centrally,
// by the `@utility skeleton` override in `theme.css`; never per usage, and never by declining to
// use the class. Geometry (`h-3`, the deterministic widths, the row height) stays ours.
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
      }}>
      {Array.from({ length: columnCount }, (_, index) => (
        <span
          key={index}
          className="skeleton h-3"
          style={{ width: SKELETON_BLOCK_WIDTHS[index % SKELETON_BLOCK_WIDTHS.length] }}
        />
      ))}
    </div>
  );
}
