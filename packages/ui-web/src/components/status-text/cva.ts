import { cva, type VariantProps } from 'class-variance-authority';

import { BODY_CLASS } from '../../lib/type-roles';

// Contract: docs/design/console-redesign/README.md §4 (data display) — status as text, not a
// pill: `--body` active, `--muted` revoked/archived, `--signal` expiring/near-ceiling.
//
// One of the few `cva.ts` files that survives the ADR 0010 shrink policy: `tone` is a real
// three-way axis, not an `active`/`error` boolean dressed up as a variant. It is also NO UPSTREAM
// on purpose — PRIMITIVES.md's status-text row says in as many words "do NOT adopt daisy
// `status` or `badge`", both of which are pills.
//
// The base mirrors `BODY_CLASS` (lib/type-roles.ts) minus its colour — deliberately colourless,
// same reason the old `ROW_BASE_CLASS` was: a colour baked into the base would tie for
// specificity with each variant's own colour utility, and which one wins would come down to
// generated-CSS source order rather than the variant the caller asked for.
//
// Derived from `BODY_CLASS` at runtime (a `.replace`, not a second hand-typed literal) so the
// font/size/leading can never drift from the role it mirrors, and so the class-budget counter —
// which tokenises quoted string literals, not computed values — charges this file nothing for a
// class it does not itself declare.
const STATUS_TEXT_BASE_CLASS = BODY_CLASS.replace(/ text-soft$/, '');

export const statusTextVariants = cva(STATUS_TEXT_BASE_CLASS, {
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
