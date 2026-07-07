import { cva, type VariantProps } from 'class-variance-authority';

export const segmentedControlVariants = cva(
  'flex-row flex-wrap items-stretch gap-1 rounded-lg bg-muted p-1',
  {
    variants: {
      width: {
        auto: '',
        full: 'w-full',
      },
    },
    defaultVariants: {
      width: 'auto',
    },
  }
);

export const segmentVariants = cva(
  'flex-row flex-1 items-center justify-center gap-2 rounded-md px-3 py-2',
  {
    variants: {
      active: {
        true: 'bg-surface shadow-sm',
        false: 'bg-transparent',
      },
      disabled: {
        true: 'opacity-40',
        false: '',
      },
    },
    defaultVariants: {
      active: false,
      disabled: false,
    },
  }
);

export const segmentLabelVariants = cva('text-sm', {
  variants: {
    active: {
      true: 'font-bold text-primary',
      false: 'font-semibold text-soft',
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const segmentDividerVariants = cva('h-6 w-px self-center bg-border');

export type SegmentedControlVariantProps = VariantProps<typeof segmentedControlVariants>;
