import { cva, type VariantProps } from 'class-variance-authority';

// ADR 0008 Decision 3 (the shell inversion): the left nav is a *floating panel*, not bordered
// chrome — separation from the floor comes from tone/elevation only, never a border line. `sidebar`
// is the persistent left panel (shown from the `compact` tier up through `full` — see
// responsive-tab-bar.tsx); `bottom` is its `guardRail`-tier (`<600`) collapse target. Both read
// `bg-surface`, the floating-panel tone (`#191919` in the ADR's dark palette, recalibrated in
// tailwind-preset.js) rather than `bg-chrome` (`#111`, reserved for the header — see
// console-header.tsx) so the left column reads as one consistent "floating menus" surface across
// tiers, matching the ADR's own framing of the whole left column as "menus."
export const navContainerVariants = cva('', {
  variants: {
    placement: {
      sidebar: 'absolute left-0 top-0 h-full w-[68px] rounded-[2px] bg-surface px-2 py-5',
      bottom: 'flex-row items-center justify-around rounded-[2px] bg-surface px-6 py-3',
    },
  },
  defaultVariants: {
    placement: 'bottom',
  },
});

export type NavContainerVariantProps = VariantProps<typeof navContainerVariants>;
