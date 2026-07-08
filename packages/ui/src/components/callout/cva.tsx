import { cva, type VariantProps } from 'class-variance-authority';

export const calloutVariants = cva('flex-row items-start gap-3 rounded-2xl p-4', {
  variants: {
    tone: {
      neutral: 'bg-muted',
      info: 'bg-primary/10',
      success: 'bg-success/10',
      warning: 'bg-secondary/10',
      error: 'bg-error/10',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export const calloutTextVariants = cva('flex-1 text-sm', {
  variants: {
    tone: {
      neutral: 'text-soft',
      info: 'text-primary',
      success: 'text-success',
      warning: 'text-secondary',
      error: 'text-error',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export type CalloutVariantProps = VariantProps<typeof calloutVariants>;
