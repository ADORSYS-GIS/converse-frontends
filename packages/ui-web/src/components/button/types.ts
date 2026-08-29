import type { Button as BaseButton } from '@base-ui/react/button';
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'icon';

/**
 * The three props Base UI's own `Button` adds on top of a native `<button>`, taken from its
 * shipped type rather than re-declared here:
 *
 *  - `render` — compose the button with another element (or another Base UI trigger) without
 *    losing the console's `btn` paint. Before this, the only direction that worked was the
 *    reverse: `<Menu.Trigger render={<Button />} />` (account-menu).
 *  - `nativeButton` — declare that `render` produced something that is NOT a `<button>`, so Base
 *    UI supplies `role="button"` and the Space/Enter activation the browser then owes us.
 *  - `focusableWhenDisabled` — a disabled control that stays reachable by keyboard
 *    (`aria-disabled` instead of the `disabled` attribute). A native `disabled` button is skipped
 *    by Tab entirely, so a user tabbing a dialog's footer never learns the confirm button exists.
 *
 * Everything the console already passes — `variant`, `size`, `disabled`, `type`, `ref`,
 * `className`, and every native button attribute — is unchanged.
 */
type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Pick<BaseButtonProps, 'render' | 'nativeButton' | 'focusableWhenDisabled'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  };
