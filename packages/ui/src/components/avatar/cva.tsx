import { cva, type VariantProps } from 'class-variance-authority';

export const avatarVariants = cva(
  'items-center justify-center overflow-hidden rounded-full bg-muted',
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const avatarInitialsVariants = cva('font-semibold text-soft', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type AvatarVariantProps = VariantProps<typeof avatarVariants>;
