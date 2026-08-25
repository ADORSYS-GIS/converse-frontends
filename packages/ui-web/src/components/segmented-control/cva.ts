import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (forms & actions) — equal-width cells,
// `--line` (`border`) dividers; active cell = `--raised` fill + 2px `--signal` bottom bar.
export const segmentedCellVariants = cva(
  [
    'relative flex h-[30px] flex-1 items-center justify-center whitespace-nowrap',
    'font-mono text-xs transition-colors duration-150 ease-out',
    'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset',
  ],
  {
    variants: {
      active: {
        true: 'bg-raised text-ink',
        false: 'bg-chrome text-subtle hover:text-soft',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export type SegmentedCellVariantProps = VariantProps<typeof segmentedCellVariants>;
