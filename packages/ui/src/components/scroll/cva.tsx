import { cva, type VariantProps } from 'class-variance-authority';

export const scrollVariants = cva('flex-1', {
  variants: {
    tone: {
      muted: 'bg-muted',
      surface: 'bg-surface',
    },
  },
  defaultVariants: {
    tone: 'muted',
  },
});

export const scrollContentVariants = cva('w-full', {
  variants: {
    pad: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    // Centers content in a bounded column on wide screens (opt out with
    // `container={false}` for screens that manage their own width). Below the
    // max width it stays full-bleed, so mobile is unchanged.
    container: {
      true: 'max-w-[1040px] mx-auto',
      false: '',
    },
  },
  defaultVariants: {
    pad: 'md',
    container: true,
  },
});

export type ScrollVariantProps = VariantProps<typeof scrollVariants> &
  VariantProps<typeof scrollContentVariants>;
