import { cva, type VariantProps } from 'class-variance-authority';

export const sectionCardVariants = cva('w-full rounded-2xl', {
  variants: {
    tone: {
      default: 'bg-surface p-6 shadow-sm',
      muted: 'bg-muted p-4',
      danger: 'border border-error bg-surface p-6',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});

export const sectionTitleVariants = cva('text-base font-semibold text-ink', {
  variants: {
    tone: {
      default: '',
      muted: '',
      danger: 'text-error',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});

export type SectionCardVariantProps = VariantProps<typeof sectionCardVariants>;
