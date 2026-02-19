import { cva, type VariantProps } from 'class-variance-authority';

export const textFieldVariants = cva(
  'rounded-xl border border-border px-3 py-2 text-base text-ink',
  {
    variants: {
      size: {
        md: '',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type TextFieldVariantProps = VariantProps<typeof textFieldVariants>;
