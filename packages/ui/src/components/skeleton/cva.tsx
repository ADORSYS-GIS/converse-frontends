import { cva, type VariantProps } from 'class-variance-authority';

export const skeletonVariants = cva('bg-border', {
  variants: {
    rounded: {
      sm: 'rounded-md',
      md: 'rounded-lg',
      xl: 'rounded-2xl',
      full: 'rounded-full',
    },
  },
  defaultVariants: {
    rounded: 'md',
  },
});

export type SkeletonVariantProps = VariantProps<typeof skeletonVariants>;
