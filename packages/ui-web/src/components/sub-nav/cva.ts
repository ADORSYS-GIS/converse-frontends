import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (shell) `SubNav` — same active treatment
// as `NavSpine` (raised fill + 2px signal left bar), rows are 28px (manage-projects.svg) vs
// NavSpine's 34px, since sub-nav sits below the nav spine in a denser stack.
export const subNavItemVariants = cva(
  [
    'relative flex h-7 w-full items-center justify-between gap-2 rounded-[2px] px-3 font-mono text-xs',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
  ],
  {
    variants: {
      active: {
        true: 'bg-raised text-ink',
        false: 'text-soft hover:bg-chrome hover:text-ink',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export type SubNavItemVariantProps = VariantProps<typeof subNavItemVariants>;
