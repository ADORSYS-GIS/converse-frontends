import { cva, type VariantProps } from 'class-variance-authority';

export const toolbarVariants = cva('w-full flex-row flex-wrap items-center justify-between gap-3', {
  variants: {
    border: {
      true: 'border-b border-border pb-4',
      false: '',
    },
  },
  defaultVariants: {
    border: false,
  },
});

export type ToolbarVariantProps = VariantProps<typeof toolbarVariants>;
