import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 — lifecycle actions in a grey step, never
// green/red. The button's own paint is declared in theme.css (see component.tsx for why daisy
// join is rejected); the base below is that class, and each variant is exactly one colour token
// — the "cva adds max 2 per variant" allowance.
//
// emphasis is a real THREE-value axis, not an active/error boolean dressed up as a variant, so it
// survives the shrink policy the same way StatusText's tone does. The note that used to sit in
// the component said cva had been "dropped for a plain object map"; that map WAS a hand-rolled
// cva, and the owner reversed the call on 2026-08-30. Nothing about the shrink policy changed —
// a single BOOLEAN axis still stays a data attribute variant with no cva file at all.
export const rowActionVariants = cva('row-action', {
  variants: {
    emphasis: {
      strong: 'text-ink',
      default: 'text-soft',
      muted: 'text-subtle',
    },
  },
  defaultVariants: {
    emphasis: 'default',
  },
});

export type RowActionVariantProps = VariantProps<typeof rowActionVariants>;
