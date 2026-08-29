// The ledger's row-height contract, in one place.
//
// Contract: docs/design/console-redesign/README.md §3 — ledger rows are 44px by default and 52px
// in review queues (Mercury). TWO components have to agree on that: `LedgerTable`'s real `<tr>`
// and `SkeletonRow`'s placeholder `<div>` grid, whose whole job is to match the final geometry
// exactly so a list does not jump when it loads.
//
// Before this they were two independent `cva.ts` copies of the same two literals. That is the
// pattern the rail alignment grid already fixed once for the rail column (`lib/rail-grid.ts`):
// one contract spelled in two files drifts, and a loading state that drifts from its loaded state
// is invisible in review — both screenshots look plausible on their own.
//
// It stays a class map rather than a number because the consumer is `cva`'s single-axis variant
// object, which wants exactly one token per branch.

/** The `density` variant axis both row renderers spread into their own `cva` call. */
export const ROW_DENSITY_CLASSES = {
  default: 'h-11',
  review: 'h-[52px]',
} as const;
