import { cva, type VariantProps } from 'class-variance-authority';

export const headingVariants = cva('text-ink', {
  variants: {
    tone: {
      title: 'text-3xl tracking-tight',
      subtitle: 'text-base text-soft',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    tone: 'title',
    align: 'left',
  },
});

export type HeadingVariantProps = VariantProps<typeof headingVariants>;
