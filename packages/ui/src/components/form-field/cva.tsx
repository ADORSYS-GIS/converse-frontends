import { cva, type VariantProps } from 'class-variance-authority';

export const formFieldVariants = cva('', {
  variants: {
    width: {
      auto: 'self-start',
      full: 'w-full',
    },
  },
  defaultVariants: {
    width: 'full',
  },
});

export type FormFieldVariantProps = VariantProps<typeof formFieldVariants>;
