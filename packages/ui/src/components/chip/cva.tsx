import { cva, type VariantProps } from 'class-variance-authority';

export const chipVariants = cva('flex-row items-center gap-1 self-start rounded-full border', {
  variants: {
    tone: {
      neutral: 'border-border bg-muted',
      brand: 'border-primary/30 bg-primary/10',
    },
    size: {
      sm: 'px-2 py-1',
      md: 'px-3 py-1.5',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'sm',
  },
});

export const chipTextVariants = cva('text-soft', {
  variants: {
    tone: {
      neutral: 'text-soft',
      brand: 'text-primary',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'sm',
  },
});

export type ChipVariantProps = VariantProps<typeof chipVariants>;
