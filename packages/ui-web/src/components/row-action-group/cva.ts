import { cva } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (data display) / §5.2 — Revoke is the
// emphasised action (`--strong`), Rotate is `--body`, Del is `--muted`.
export const rowActionVariants = cva(
  [
    'font-mono text-[11px] transition-colors duration-150 ease-out',
    'hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
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
  },
);
