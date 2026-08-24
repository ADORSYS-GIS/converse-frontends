import { cva } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §3 — LedgerTable rows are 44px by default,
// 52px in review queues (Mercury). SkeletonRow mirrors the same row heights so loading rows
// match the final geometry exactly.
export const skeletonRowVariants = cva('grid items-center gap-4 border-b border-raised', {
  variants: {
    density: {
      default: 'h-11',
      review: 'h-[52px]',
    },
  },
  defaultVariants: {
    density: 'default',
  },
});

// Deterministic, varied block widths so a run of skeleton rows doesn't look like one
// repeated bar — never randomised (loading states must be visually stable across renders).
export const SKELETON_BLOCK_WIDTHS = ['72%', '48%', '60%', '36%', '64%', '44%'];
