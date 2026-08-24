import { cva, type VariantProps } from 'class-variance-authority';

// Contract: docs/design/console-redesign/README.md §4 (shell) — active item = `--raised` fill
// + 2px `--signal` left bar; mono 12px labels. Rows bleed under the RailPanel's 16px inset via
// a negative margin on the list (see component.tsx) so the active fill reads near edge-to-edge,
// matching overview.svg's nav treatment.
export const navSpineItemVariants = cva(
  [
    'relative flex h-[34px] w-full items-center gap-2 rounded-[2px] px-3 font-mono text-xs',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
  ],
  {
    variants: {
      active: {
        true: 'bg-raised text-ink',
        false: 'text-soft hover:bg-chrome hover:text-ink',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export type NavSpineItemVariantProps = VariantProps<typeof navSpineItemVariants>;

// `bottom-bar` layout (console-ui skill "Shape and layout" — mobile-first <600 nav dock): a
// horizontal strip, icon above a 10px label, active = `primary` text + a 2px `--signal` top bar
// (the rail's left bar rotated to the top edge, matching how the sheet direction rotates too).
export const navBottomBarItemVariants = cva(
  [
    'relative flex h-full flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px]',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset',
  ],
  {
    variants: {
      active: {
        true: 'text-primary',
        false: 'text-subtle hover:text-soft',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export type NavBottomBarItemVariantProps = VariantProps<typeof navBottomBarItemVariants>;
