import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva('flex-row items-center self-start rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-muted',
      brand: 'bg-primary/10',
      success: 'bg-success/10',
      warning: 'bg-secondary/10',
      error: 'bg-error/10',
      info: 'bg-accent/10',
    },
    size: {
      sm: 'gap-1 px-2 py-0.5',
      md: 'gap-1.5 px-2.5 py-1',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'sm',
  },
});

export const badgeTextVariants = cva('font-semibold', {
  variants: {
    tone: {
      neutral: 'text-soft',
      brand: 'text-primary',
      success: 'text-success',
      warning: 'text-secondary',
      error: 'text-error',
      info: 'text-accent',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'sm',
  },
});

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
