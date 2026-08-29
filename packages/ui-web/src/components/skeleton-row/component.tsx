import React from 'react';

import { cn } from '../../cn';
import { SKELETON_BLOCK_CLASS, SKELETON_BLOCK_WIDTHS } from '../../lib/skeleton-geometry';
import { skeletonRowVariants } from './cva';
import type { SkeletonRowProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — `--raised` block matching
// the final geometry of a table row exactly. No shimmer, no spinner. Used standalone (any list)
// or composed by LedgerTable's loading state, aligned via `gridTemplateColumns`.
//
// PRIMITIVE-MATRIX row 24: the blocks wear daisy's `skeleton`, which already resolves to
// `--color-base-300` (`raised`) at `--radius-box` (2px) — exactly what the hand-written
// `bg-raised rounded-[2px]` pair spelled out. daisy's own shimmer is suppressed ONCE, centrally,
// by the `@utility skeleton` override in `theme.css`; never per usage, and never by declining to
// use the class.
//
// The geometry that stays ours is now stated where it is SHARED rather than here: the block in
// the skeleton geometry module imported below (LedgerTable's loading `<tbody>` renders the same
// block and cannot reuse this component, since a `<div>` grid may not sit inside a `<tbody>`),
// the row height in the row density module beside it (it must equal the real ledger row's), and
// the row's own grid in `theme.css`.
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
          className={SKELETON_BLOCK_CLASS}
          style={{ width: SKELETON_BLOCK_WIDTHS[index % SKELETON_BLOCK_WIDTHS.length] }}
        />
      ))}
    </div>
  );
}
