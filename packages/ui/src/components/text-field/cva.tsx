import { cva, type VariantProps } from 'class-variance-authority';

export const textFieldVariants = cva(
  'rounded-xl border px-3 py-2 text-base text-ink',
  {
    variants: {
      size: {
        md: '',
        lg: 'text-lg',
      },
      error: {
        true: 'border-error',
        false: 'border-border',
      },
    },
    defaultVariants: {
      size: 'md',
      error: false,
    },
  }
);

export type TextFieldVariantProps = VariantProps<typeof textFieldVariants>;
