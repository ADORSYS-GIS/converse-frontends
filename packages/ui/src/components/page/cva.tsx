import { cva, type VariantProps } from 'class-variance-authority';

export const pageVariants = cva('flex-1', {
  variants: {
    tone: {
      muted: 'bg-muted',
      surface: 'bg-surface',
    },
    pad: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    tone: 'muted',
    pad: 'md',
  },
});

export type PageVariantProps = VariantProps<typeof pageVariants>;
