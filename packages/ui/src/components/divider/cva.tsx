import { cva, type VariantProps } from 'class-variance-authority';

export const dividerVariants = cva('', {
  variants: {
    orientation: {
      horizontal: 'h-px w-full',
      vertical: 'w-px self-stretch',
    },
    tone: {
      border: 'bg-border',
      muted: 'bg-muted',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    tone: 'border',
  },
});

export type DividerVariantProps = VariantProps<typeof dividerVariants>;
