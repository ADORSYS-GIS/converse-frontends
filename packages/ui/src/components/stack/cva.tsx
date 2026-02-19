import { cva, type VariantProps } from 'class-variance-authority';

export const stackVariants = cva('flex flex-col', {
  variants: {
    direction: {
      column: 'flex-col',
      row: 'flex-row',
    },
    gap: {
      none: '',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      between: 'justify-between',
      around: 'justify-around',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
    },
    flex: {
      none: '',
      grow: 'flex-1',
    },
    top: {
      none: '',
      sm: 'mt-2',
      md: 'mt-4',
      lg: 'mt-6',
    },
    width: {
      auto: '',
      full: 'w-full',
    },
  },
  defaultVariants: {
    direction: 'column',
    gap: 'none',
    align: 'stretch',
    justify: 'start',
    wrap: 'nowrap',
    flex: 'none',
    top: 'none',
    width: 'auto',
  },
});

export type StackVariantProps = VariantProps<typeof stackVariants>;
