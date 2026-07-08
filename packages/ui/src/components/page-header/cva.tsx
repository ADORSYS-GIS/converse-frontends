import { cva, type VariantProps } from 'class-variance-authority';

export const pageHeaderVariants = cva('w-full bg-surface', {
  variants: {
    border: {
      true: 'border-b border-border',
      false: '',
    },
  },
  defaultVariants: {
    border: true,
  },
});

export type PageHeaderVariantProps = VariantProps<typeof pageHeaderVariants>;
