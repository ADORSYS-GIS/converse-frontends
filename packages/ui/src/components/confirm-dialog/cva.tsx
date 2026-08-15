import { cva, type VariantProps } from 'class-variance-authority';

// Mirrors SectionCard's default/danger tones: a confirm dialog is a card
// whose only job is to ask one question and offer two ways out.
export const confirmDialogVariants = cva('w-full rounded-2xl bg-surface', {
  variants: {
    tone: {
      neutral: 'p-6 shadow-sm',
      danger: 'border border-error p-6',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export type ConfirmDialogVariantProps = VariantProps<typeof confirmDialogVariants>;
