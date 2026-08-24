import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (forms & actions) —
// primary = `--signal` fill + `--strong` text; secondary = transparent +
// `--line` border + `--body` text; ghost = text only. Radius 2px, height 30–34,
// mono type everywhere structural (console-ui skill).
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-[2px] font-mono',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-muted',
    'disabled:cursor-not-allowed disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-ink hover:bg-primary/90',
        secondary: 'border border-border bg-transparent text-soft hover:bg-chrome',
        ghost: 'bg-transparent text-soft hover:text-ink',
      },
      size: {
        sm: 'h-[30px] px-3 text-xs',
        md: 'h-[34px] px-4 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
