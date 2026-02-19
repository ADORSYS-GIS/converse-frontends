import { cva, type VariantProps } from 'class-variance-authority';

export const lottieVariants = cva('items-center justify-center', {
  variants: {
    size: {
      xs: 'h-10 w-10',
      sm: 'h-16 w-16',
      md: 'h-24 w-24',
      lg: 'h-32 w-32',
      xl: 'h-48 w-48',
    },
    tone: {
      default: '',
      muted: 'opacity-70',
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'default',
  },
});

export type LottieVariantProps = VariantProps<typeof lottieVariants>;
