import { cva, type VariantProps } from 'class-variance-authority';

export const divVariants = cva('flex flex-col', {
  variants: {
    pad: {
      none: '',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    },
    tone: {
      default: 'bg-transparent',
      surface: 'bg-surface',
      muted: 'bg-muted',
      brand: 'bg-primary',
      brandSoft: 'bg-primary/10',
      accentSoft: 'bg-accent/10',
      warningSoft: 'bg-secondary/10',
      successSoft: 'bg-success/10',
      success: 'bg-success',
    },
    rounded: {
      none: '',
      sm: 'rounded-md',
      md: 'rounded-lg',
      xl: 'rounded-2xl',
      full: 'rounded-full',
    },
    shadow: {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
    },
    size: {
      none: '',
      iconSm: 'h-8 w-8',
      iconMd: 'h-10 w-10',
      iconLg: 'h-12 w-12',
      iconXl: 'h-24 w-24',
      dot: 'h-2 w-2',
    },
    height: {
      none: '',
      hairline: 'h-px',
      xs: 'h-2',
      sm: 'h-3',
      md: 'h-4',
    },
    width: {
      auto: '',
      full: 'w-full',
    },
    maxWidth: {
      none: '',
      md: 'max-w-md',
    },
    self: {
      none: '',
      start: 'self-start',
      center: 'self-center',
      end: 'self-end',
      stretch: 'self-stretch',
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
      end: 'justify-end',
      between: 'justify-between',
    },
  },
  defaultVariants: {
    pad: 'none',
    tone: 'default',
    rounded: 'none',
    shadow: 'none',
    size: 'none',
    height: 'none',
    width: 'auto',
    maxWidth: 'none',
    self: 'none',
    align: 'stretch',
    justify: 'start',
  },
});

export type DivVariantProps = VariantProps<typeof divVariants>;
