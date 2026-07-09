import { cva, type VariantProps } from 'class-variance-authority';

export const navItemVariants = cva('flex-row items-center justify-center bg-transparent', {
  variants: {
    placement: {
      sidebar: 'h-11 w-11 rounded-lg p-0',
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
    // Labelled side-rail item: stack the icon over its caption in a full-width
    // pill (overrides the bare 44×44 icon square from the `sidebar` variant).
    {
      placement: 'sidebar',
      labelVisible: true,
      className: 'h-auto w-full flex-col gap-1 px-1 py-2',
    },
    { placement: 'sidebar', active: true, className: 'bg-ink' },
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
      // Rail caption: smaller + centred so two-word titles ("API Keys") sit
      // tidily under the icon.
      sidebar: 'text-[11px] font-medium leading-tight text-center',
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
