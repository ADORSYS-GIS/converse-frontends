import { Button as BaseButton } from '@base-ui/react/button';
import React, { forwardRef } from 'react';

import { cn } from '../../cn';
import { buttonVariants } from './cva';
import type { ButtonProps } from './types';

// The paint — three variants × three sizes, all daisy classes — is `cva.ts`, which also owns the
// primary/md defaults this signature used to restate.
//
// THE ELEMENT IS BASE UI'S, and this is the half that was missing until 2026-08-29: the paint
// was correct while the button underneath was a bare forwardRef, so the library's most-used
// component delegated no behaviour at all. Four things arrive with the swap that a native
// <button> does not have, and each is checked against @base-ui/react/button's own source rather
// than its docs:
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
// costs a class: the daisy block in theme.css already keys disabled off :disabled, and the
// default type is what this component passed by hand anyway.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, disabled, type = 'button', ...props },
  ref
) {
  return (
    <BaseButton
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
