import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (forms & actions) — `#111` (`chrome`)
// inset fill, `--line` (`border`) border, radius 2, height 30; focus = border → `--signal`
// (`primary`); error state = border `--signal` + `meta` error line below (console-ui skill).
export const fieldControlVariants = cva(
  [
    'w-full rounded-[2px] border bg-chrome font-mono text-sm text-soft placeholder:text-subtle',
    'transition-colors duration-150 ease-out',
    'focus:outline-none focus:border-primary',
    'disabled:cursor-not-allowed disabled:opacity-60',
  ],
  {
    variants: {
      error: {
        true: 'border-primary',
        false: 'border-border',
      },
      multiline: {
        true: 'min-h-[80px] px-3 py-2 resize-y',
        false: 'h-[30px] px-3',
      },
    },
    defaultVariants: {
      error: false,
      multiline: false,
    },
  },
);

export type FieldControlVariantProps = VariantProps<typeof fieldControlVariants>;

// Label above the control: `label` role — 10px mono, uppercase, tracked .09em, `subtle`.
export const fieldLabelClassName = 'block font-mono text-[10px] uppercase tracking-[.09em] text-subtle';
