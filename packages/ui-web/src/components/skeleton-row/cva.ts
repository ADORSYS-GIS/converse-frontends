import { cva } from 'class-variance-authority';

import { ROW_DENSITY_CLASSES } from '../../lib/row-density';

// The row's own geometry — a grid of blocks on a hairline — is `skeleton-row` in theme.css.
// It moved there for the reason every other wall did: it is what the part IS, not a decision this
// component makes per render, and daisy has no vocabulary for a placeholder row.
//
// What is left here is exactly the one variant axis: how tall. Those two literals are shared with
// `LedgerTable`'s real rows through `lib/row-density.ts` — the loading row must match the loaded
// row exactly (README §3), and two independent copies of "44 or 52" is how that silently stops
// being true.
export const skeletonRowVariants = cva('skeleton-row', {
  variants: {
    density: ROW_DENSITY_CLASSES,
  },
  defaultVariants: {
    density: 'default',
  },
});
