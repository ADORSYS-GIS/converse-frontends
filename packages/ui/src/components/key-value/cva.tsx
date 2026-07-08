import { cva, type VariantProps } from 'class-variance-authority';

export const keyValueVariants = cva('w-full', {
  variants: {
    layout: {
      row: 'flex-row items-center justify-between gap-3',
      stacked: 'flex-col gap-0.5',
    },
  },
  defaultVariants: {
    layout: 'row',
  },
});

export type KeyValueVariantProps = VariantProps<typeof keyValueVariants>;
