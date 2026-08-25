import React, { forwardRef } from 'react';

import { cn } from '../../cn';
import type { ButtonProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — primary = `--signal` fill +
// `primary-content` text; secondary = transparent + `--line` border + `--body` text; ghost =
// text only. Radius 2, height 30–34 (`size: "icon"` = 30×30, always `variant="ghost"` + an
// explicit `aria-label`, no visible text — the contextual sheet-trigger size).
//
// ADR 0010 Decision 4 (`cva.ts` deleted): daisy's `btn` already reads `--radius-field` (2px) and
// zeroes shadow/inset via `--depth: 0`. `btn-primary` sets `--btn-color`/`-fg` straight to
// `--color-primary`/`-primary-content` (the AA-corrected pairing, Decision 3b) from the theme.
// `secondary`/`size` stay plain overrides: daisy's `btn-outline` borrows `base-content`, not our
// `--line` token, and its `btn-sm`/`-md` heights (32/40px) don't match ours (30/34px).
const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn-primary',
  secondary: 'bg-transparent! border-border! text-soft! hover:bg-chrome!',
  ghost: 'btn-ghost',
};

const SIZE_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-[30px]! px-3! text-xs!',
  md: 'h-[34px]! px-4! text-sm!',
  icon: 'h-[30px]! w-[30px]! p-0!',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'btn font-mono font-normal! shadow-none!',
        'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-muted',
        'disabled:opacity-60! disabled:cursor-not-allowed',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    />
  );
});
