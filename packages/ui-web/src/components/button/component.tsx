import React, { forwardRef } from 'react';

import { cn } from '../../cn';
import type { ButtonProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — primary = `--signal` fill +
// primary-content text; secondary = transparent + `--line` border + `--body` text; ghost =
// text only. Radius 2, height 30/34, and the icon size = 30x30 (always ghost, always an explicit
// aria-label, no visible text — the contextual sheet-trigger size).
//
// ADR 0010 Decision 4 (`cva.ts` deleted, and now the overrides with it): every one of these is a
// daisy class. daisy's `btn` already reads `--radius-field` (2px) and zeroes shadow/inset through
// `--depth: 0`; `btn-primary` sets `--btn-color`/`--btn-fg` straight to `--color-primary`/
// `--color-primary-content` (the AA-corrected pairing, Decision 3b) out of the theme.
//
// The three places daisy did not land on the contract — its 600 weight and outline focus ring, its
// 32/40px `btn-sm`/`btn-md` heights, and a `btn-secondary` that fills with `--color-secondary`
// rather than drawing a `--line` border — are corrected once in `theme.css` against daisy's own
// classes and variables, not per variant here. The icon size is daisy's own `btn-square` at the
// small size, which is exactly 30x30 with zero inline padding; the 16px glyph pin travels with it.
const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

const SIZE_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  icon: 'btn-square btn-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', disabled, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...props}
    />
  );
});
