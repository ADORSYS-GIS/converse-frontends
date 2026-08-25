import { cva } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (data display) — Midday treatment:
// transparent on the floor, 0 radius, hairline `--raised` row rules, no striping, 44px rows
// (52px variant for review queues), row hover = `--chrome` fill.
export const ledgerRowVariants = cva(
  [
    'group grid items-center gap-4 border-b border-raised',
    'transition-colors duration-150 ease-out hover:bg-chrome focus-within:bg-chrome',
  ],
  {
    variants: {
      density: {
        default: 'h-11',
        review: 'h-[52px]',
      },
      selectable: {
        true: [
          'cursor-pointer focus:outline-hidden',
          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary focus-visible:-outline-offset-1',
        ],
        false: '',
      },
    },
    defaultVariants: {
      density: 'default',
      selectable: false,
    },
  },
);
