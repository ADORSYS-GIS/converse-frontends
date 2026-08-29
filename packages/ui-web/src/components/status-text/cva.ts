import { cva, type VariantProps } from 'class-variance-authority';

import { ROW_BASE_CLASS } from '../../lib/type-roles';

// Contract: docs/design/console-redesign/README.md §4 (data display) — status as text, not a
// pill: `--body` active, `--muted` revoked/archived, `--signal` expiring/near-ceiling.
//
// One of the few `cva.ts` files that survives the ADR 0010 shrink policy: `tone` is a real
// three-way axis, not an `active`/`error` boolean dressed up as a variant. It is also NO UPSTREAM
// on purpose — PRIMITIVES.md's status-text row says in as many words "do NOT adopt daisy
// `status` or `badge`", both of which are pills.
//
// The base is the shared colourless `row` role, so the size can never drift from the table rows
// this text sits in; each variant is exactly one token, the colour it exists to select.
export const statusTextVariants = cva(ROW_BASE_CLASS, {
  variants: {
    tone: {
      active: 'text-soft',
      muted: 'text-subtle',
      attention: 'text-primary',
    },
  },
  defaultVariants: {
    tone: 'active',
  },
});

export type StatusTextVariantProps = VariantProps<typeof statusTextVariants>;
