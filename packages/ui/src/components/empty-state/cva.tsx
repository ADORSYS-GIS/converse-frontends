import { cva, type VariantProps } from 'class-variance-authority';

export const emptyStateVariants = cva('w-full items-center', {
  variants: {
    pad: {
      none: '',
      md: 'py-6',
      lg: 'py-10',
    },
  },
  defaultVariants: {
    pad: 'md',
  },
});

export type EmptyStateVariantProps = VariantProps<typeof emptyStateVariants>;
