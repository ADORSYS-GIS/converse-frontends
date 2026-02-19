import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva('flex-row items-center justify-center', {
  variants: {
    variant: {
      primary: 'bg-primary shadow-md',
      ghost: 'bg-transparent',
      neutral: 'bg-surface shadow-sm',
      icon: 'bg-ink',
    },
    shape: {
      none: '',
      circle: 'rounded-full',
    },
    size: {
      sm: 'h-9 px-4 rounded-xl',
      md: 'h-10 px-4 rounded-xl',
      lg: 'h-12 px-5 rounded-2xl',
      iconSm: 'h-8 w-8 rounded-full',
      icon: 'h-10 w-10 rounded-full',
    },
    width: {
      auto: '',
      full: 'w-full',
    },
    disabled: {
      true: 'opacity-60',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    shape: 'none',
    size: 'md',
    width: 'auto',
  },
});

export const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-surface',
      ghost: 'text-primary',
      neutral: 'text-ink',
      icon: 'text-surface',
    },
    size: {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      iconSm: 'text-xs',
      icon: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
