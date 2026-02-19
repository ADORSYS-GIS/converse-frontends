import { cva, type VariantProps } from 'class-variance-authority';

export const checkboxVariants = cva('border border-border bg-surface', {
  variants: {
    size: {
      sm: 'h-4 w-4 rounded-[3px]',
      md: 'h-5 w-5 rounded-[4px]',
      lg: 'h-6 w-6 rounded-[5px]',
    },
    checked: {
      true: 'border-ink',
      false: 'border-border',
    },
    disabled: {
      true: 'opacity-50',
      false: '',
    },
  },
  defaultVariants: {
    size: 'md',
    checked: false,
    disabled: false,
  },
});

export type CheckboxVariantProps = VariantProps<typeof checkboxVariants>;
