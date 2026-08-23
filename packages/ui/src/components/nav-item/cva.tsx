import { cva, type VariantProps } from 'class-variance-authority';

export const navItemVariants = cva('flex-row items-center justify-center bg-transparent', {
  variants: {
    placement: {
      sidebar: 'h-10 w-10 rounded-lg p-0',
      bottom: 'rounded-full px-2 py-2',
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
    // ADR 0008 Decision 5: the single accent (`primary`, recalibrated to `#DA5C2C` in
    // tailwind-preset.js) marks active state — never decoration — so the active pill uses it
    // directly instead of the old plain-`ink` fill.
    { placement: 'sidebar', active: true, className: 'bg-primary' },
    { placement: 'sidebar', active: false, className: 'bg-transparent' },
    { placement: 'bottom', active: true, className: 'bg-transparent' },
    { placement: 'bottom', active: false, className: '' },
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
    // `text-primary`, not the codebase's separate `accent` token (a distinct, untouched
    // "secondary emphasis" hue) — ADR 0008's "single accent" is this app's `primary` token.
    { placement: 'bottom', active: true, className: 'text-primary' },
    { placement: 'bottom', active: false, className: 'text-ink' },
  ],
  defaultVariants: {
    placement: 'bottom',
    active: false,
  },
});

export type NavItemVariantProps = VariantProps<typeof navItemVariants>;
