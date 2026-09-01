import { cva, type VariantProps } from 'class-variance-authority';

import type { StatCardDelta } from './types';

// Deltas are direction + wording in greys, never green/red (ADR 0008). `flat` reads one step back
// because "no change" is the least newsworthy of the three. The base is the card's own delta line
// from theme.css; each variant is exactly one colour token.
//
// `direction` is a real three-value axis, so it earns the file under the shrink policy — but it
// has no sensible default (a delta always states its direction), so no `defaultVariants` is
// declared and the component keeps passing the value it was given.
export const statCardDeltaVariants = cva('stat-card-delta', {
  variants: {
    direction: {
      up: 'text-soft',
      down: 'text-soft',
      flat: 'text-subtle',
    },
  },
});

export type StatCardDeltaVariantProps = VariantProps<typeof statCardDeltaVariants>;

// CONTENT, NOT CLASSES, and therefore deliberately not a cva variant: cva composes className
// strings, and these three are the glyph the delta line renders. Kept here beside the tone axis
// they travel with, the way skeleton-row keeps its block widths beside its row variants.
export const DELTA_GLYPH: Record<StatCardDelta['direction'], string> = {
  up: '▲',
  down: '▼',
  flat: '—',
};
