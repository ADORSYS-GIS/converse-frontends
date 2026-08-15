import { cva, type VariantProps } from 'class-variance-authority';

// A ring built from a full circular border plus a differently-coloured top
// edge, then rotated — cheaper than an SVG/arc and matches Skeleton's
// Animated-driven-by-className approach (no extra deps).
export const spinnerVariants = cva('rounded-full border-transparent', {
  variants: {
    size: {
      sm: 'h-4 w-4 border-2',
      md: 'h-6 w-6 border-2',
      lg: 'h-9 w-9 border-[3px]',
    },
    tone: {
      neutral: 'border-t-soft border-r-soft',
      brand: 'border-t-primary border-r-primary',
      inverse: 'border-t-surface border-r-surface',
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'brand',
  },
});

export type SpinnerVariantProps = VariantProps<typeof spinnerVariants>;
