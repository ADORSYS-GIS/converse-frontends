import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (data display) — status as text, not a
// pill: `--body` active, `--muted` revoked/archived, `--signal` expiring/near-ceiling.
export const statusTextVariants = cva('font-mono text-xs', {
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
