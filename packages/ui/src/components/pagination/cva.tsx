import { cva, type VariantProps } from 'class-variance-authority';

export const paginationVariants = cva('w-full bg-surface', {
  variants: {
    border: {
      true: 'border-t border-border',
      false: '',
    },
  },
  defaultVariants: {
    border: true,
  },
});

export type PaginationVariantProps = VariantProps<typeof paginationVariants>;
