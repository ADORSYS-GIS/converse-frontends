import { cva } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (data display) — Midday treatment:
// transparent on the floor, 0 radius, hairline `--raised` row rules, no striping, 44px rows
// (52px variant for review queues), row hover = `--chrome` fill.
//
// This survives the console-ui skill's shrink policy on its own merits: `density` is a real enum
// and `selectable` changes cursor/focus affordance, so it is not "a `cva.ts` that only encodes
// boolean state".
//
// The rows are real `<tr>`s now (daisy `table`, PRIMITIVES.md row `ledger-table`). Two
// consequences the class list encodes:
//
//  1. daisy's `table` sets `border-collapse: separate`, and in the separated border model a
//     border declared on a `<tr>` is simply not painted — the hairline HAS to live on the cells,
//     hence `[&>td]:border-b` rather than a plain `border-b`. daisy paints its own hairline in
//     `color-mix(base-content 5%)` and skips the last row; ours is the `raised` token on every
//     row, which is what the spec calls for.
//  2. `items-center`/`gap-4` are gone: cell vertical centring is daisy's `vertical-align: middle`
//     and the inter-column gutter is `table-xs`'s cell padding (see `component.tsx`).
export const ledgerRowVariants = cva(
  [
    'group [&>td]:border-b [&>td]:border-raised',
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
  }
);
