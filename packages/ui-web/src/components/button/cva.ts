import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 — primary = `--signal` fill +
// primary-content text; secondary = transparent + `--line` border + `--body` text; ghost =
// text only. Radius 2, height 30/34, and the icon size = 30x30 (always ghost, always an explicit
// aria-label, no visible text — the contextual sheet-trigger size).
//
// ADR 0010 Decision 4: every one of these is a daisy class. daisy's `btn` already reads
// `--radius-field` (2px) and zeroes shadow/inset through `--depth: 0`; `btn-primary` sets
// `--btn-color`/`--btn-fg` straight to `--color-primary`/`--color-primary-content` (the
// AA-corrected pairing, Decision 3b) out of the theme. The three places daisy did not land on the
// contract — its 600 weight and outline focus ring, its 32/40px `btn-sm`/`btn-md` heights, and a
// `btn-secondary` that fills with `--color-secondary` rather than drawing a `--line` border — are
// corrected once in `theme.css` against daisy's own classes and variables, never per variant here.
// The icon size is daisy's own `btn-square` at the small size, which is exactly 30x30 with zero
// inline padding; the 16px glyph pin travels with it.
//
// THIS IS THE ONE GENUINELY TWO-AXIS SET IN THE LIBRARY (owner, 2026-08-30: "No! Use cva"). It was
// two Record tables consulted by index in the component — which is a hand-rolled cva minus the
// type inference, the defaults and the compound slot. variant × size is 3 × 3, so it clears the
// shrink policy's bar (a cva file that only encodes boolean state is deleted in favour of a data
// attribute variant, which is why NavSpine lost its own) by the widest margin in the library.
// defaultVariants owns primary/md now, so the component signature no longer restates them.
export const buttonVariants = cva('btn', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
    },
    size: {
      sm: 'btn-sm',
      md: 'btn-md',
      icon: 'btn-square btn-sm',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
