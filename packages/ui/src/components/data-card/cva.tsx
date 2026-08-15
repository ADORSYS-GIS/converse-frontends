import { cva, type VariantProps } from 'class-variance-authority';

export const dataCardVariants = cva('w-full rounded-2xl', {
  variants: {
    tone: {
      default: 'bg-surface p-6 shadow-sm',
      muted: 'bg-muted p-4',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});

export type DataCardVariantProps = VariantProps<typeof dataCardVariants>;
