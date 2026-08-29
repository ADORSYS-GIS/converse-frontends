import { Button as BaseButton } from '@base-ui/react/button';
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
//
// THE ELEMENT IS BASE UI'S, and this is the half that was missing until 2026-08-29: the paint
// above was correct while the button underneath was a bare forwardRef, so the library's
// most-used component delegated no behaviour at all. Four things arrive with the swap that a
// native <button> does not have, and each is checked against @base-ui/react/button's own source
// rather than its docs:
//
//  1. Composition BOTH ways. account-menu already did Menu.Trigger render={<Button />}; the
//     reverse — Button render={<SomeTrigger />}, or Button render={<a />} — was impossible. It is
//     the same useRenderElement path Field and Select already use here, so a rendered <a> gets
//     Space-activates-like-a-button behaviour and role=button from the nativeButton={false} flag.
//  2. A disabled button that can still be focused (focusableWhenDisabled), which swaps the
//     disabled ATTRIBUTE for aria-disabled and keeps a Tab stop. A natively disabled button is
//     skipped by Tab, so a dialog footer's greyed-out confirm is invisible to a keyboard user.
//  3. Disabled is enforced in the handlers too, not only by the attribute. The attribute alone
//     stops caring the moment the element is not a real <button> — exactly the case (1) opens up.
//  4. Composite awareness: inside a Base UI Toolbar or Menu, useButton reads the composite
//     context and hands over its tabIndex and Space/Enter handling to the roving-focus owner
//     instead of fighting it. console-header is queued for Toolbar; this is the prerequisite.
//
// Base UI also supplies a data-disabled attribute and forces type="button" by default. Neither
// costs a class: the `btn` block in theme.css already keys disabled off :disabled, and the
// default type is what this component passed by hand anyway.
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
    <BaseButton
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...props}
    />
  );
});
