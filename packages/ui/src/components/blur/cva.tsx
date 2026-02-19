import { cva, type VariantProps } from 'class-variance-authority';

export const blurVariants = cva('', {
  variants: {
    radius: {
      none: '',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    },
  },
  defaultVariants: {
    radius: 'none',
  },
});

export type BlurVariantProps = VariantProps<typeof blurVariants>;
