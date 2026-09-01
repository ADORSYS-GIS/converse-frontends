import { Field as BaseField } from '@base-ui/react/field';
import { Switch } from '@base-ui/react/switch';
import React from 'react';

import { cn } from '../../cn';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ToggleProps } from './types';

// Base UI Switch beside its own label — `Field.Root`/`Field.Label` wire the click-to-toggle and
// `aria-labelledby` association a bare `<label>` around a non-native `role="switch"` element does
// not get for free. Paint is entirely daisy `toggle` plus the shared `toggle-row`/`LABEL_CLASS`
// parts (class-budget: daisy for paint, a named `theme.css` part or a `lib/` constant for the
// rest, never a fresh hand-written string per component).
export function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <BaseField.Root className={cn('toggle-row', className)}>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        className="toggle"
      />
      {label ? (
        <BaseField.Label className={cn(LABEL_CLASS, 'cursor-pointer')}>{label}</BaseField.Label>
      ) : null}
    </BaseField.Root>
  );
}
