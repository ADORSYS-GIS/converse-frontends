import { cva } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (data display) — Midday treatment:
// transparent on the floor, 0 radius, hairline `--raised` row rules, no striping, 44px rows
// (52px variant for review queues), row hover = `--chrome` fill.
//
// This survives the console-ui skill's shrink policy on its own merits: `density` is a real enum
// and `selectable` changes cursor/focus affordance, so it is not "a `cva.ts` that only encodes
// boolean state".
//
// Everything that is TRUE OF EVERY ROW now lives in `theme.css`'s `console-table` — the cell
// hairline, the hover/focus-within fill, the transition — because those are the ledger contract
// rather than a per-row decision, and because in the separated border model daisy `table` uses,
// a border declared on a `<tr>` is never painted at all (it has to sit on the cells, which a
// descendant rule can say once instead of two arbitrary variants per row). What is left here is
// exactly the two axes: how tall, and whether the row is a control.
export const ledgerRowVariants = cva('', {
  variants: {
    density: {
      default: 'h-11',
      review: 'h-[52px]',
    },
    selectable: {
      true: 'ledger-row-selectable',
      false: '',
    },
  },
  defaultVariants: {
    density: 'default',
    selectable: false,
  },
});
