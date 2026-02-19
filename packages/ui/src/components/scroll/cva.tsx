import { cva, type VariantProps } from 'class-variance-authority';

export const scrollVariants = cva('flex-1', {
  variants: {
    tone: {
      muted: 'bg-muted',
      surface: 'bg-surface',
    },
  },
  defaultVariants: {
    tone: 'muted',
  },
});

export const scrollContentVariants = cva('w-full', {
  variants: {
    pad: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    pad: 'md',
  },
});

export type ScrollVariantProps = VariantProps<typeof scrollVariants> &
  VariantProps<typeof scrollContentVariants>;
