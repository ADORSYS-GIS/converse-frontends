import { cva, type VariantProps } from 'class-variance-authority';

export const cardVariants = cva('rounded-2xl bg-surface shadow-sm', {
  variants: {
    size: {
      sm: 'p-4',
      md: 'p-6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type CardVariantProps = VariantProps<typeof cardVariants>;
