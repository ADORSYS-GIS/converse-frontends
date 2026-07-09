import { cva, type VariantProps } from 'class-variance-authority';

export const navContainerVariants = cva('', {
  variants: {
    placement: {
      sidebar: 'absolute left-0 top-0 h-full w-[68px] border-r border-border bg-surface px-2 py-5',
      bottom: 'flex-row items-center justify-around border-t border-border bg-surface px-6 py-3',
    },
  },
  defaultVariants: {
    placement: 'bottom',
  },
});

export type NavContainerVariantProps = VariantProps<typeof navContainerVariants>;
