import { cva, type VariantProps } from 'class-variance-authority';

export const navItemVariants = cva('flex-row items-center justify-center bg-transparent', {
  variants: {
    placement: {
      sidebar: 'rounded-md px-3 py-2',
      bottom: 'rounded-full px-3 py-2',
    },
    active: {
      true: '',
      false: '',
    },
    labelVisible: {
      true: 'gap-2',
      false: '',
    },
  },
  compoundVariants: [
    { placement: 'sidebar', active: true, className: 'bg-ink' },
    { placement: 'sidebar', active: false, className: 'bg-transparent' },
    { placement: 'bottom', active: true, className: 'bg-accent/15 px-4' },
    { placement: 'bottom', active: false, className: 'px-2' },
  ],
  defaultVariants: {
    placement: 'bottom',
    active: false,
    labelVisible: true,
  },
});

export const navLabelVariants = cva('text-sm font-semibold', {
  variants: {
    placement: {
      sidebar: '',
      bottom: '',
    },
    active: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    { placement: 'sidebar', active: true, className: 'text-surface' },
    { placement: 'sidebar', active: false, className: 'text-soft' },
    { placement: 'bottom', active: true, className: 'text-accent' },
    { placement: 'bottom', active: false, className: 'text-ink' },
  ],
  defaultVariants: {
    placement: 'bottom',
    active: false,
  },
});

export type NavItemVariantProps = VariantProps<typeof navItemVariants>;
