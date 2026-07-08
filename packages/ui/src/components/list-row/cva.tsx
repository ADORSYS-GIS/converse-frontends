import { cva, type VariantProps } from 'class-variance-authority';

export const listRowVariants = cva('w-full', {
  variants: {
    tone: {
      transparent: 'bg-transparent',
      surface: 'bg-surface',
      muted: 'bg-muted',
    },
    pad: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
    },
    rounded: {
      none: '',
      md: 'rounded-lg',
      xl: 'rounded-2xl',
    },
  },
  defaultVariants: {
    tone: 'transparent',
    pad: 'none',
    rounded: 'none',
  },
});

export type ListRowVariantProps = VariantProps<typeof listRowVariants>;
