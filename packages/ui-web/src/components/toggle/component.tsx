import { Field as BaseField } from '@base-ui/react/field';
import { Switch } from '@base-ui/react/switch';
import React from 'react';

import { cn } from '../../cn';
import type { ToggleProps } from './types';

// Extracted from `ReportExportPanel`'s inline include-toggles (ADR 0010 Decision 4: Base UI
// Switch + daisy `toggle` — daisy's `.toggle` CSS already matches `[aria-checked]`, exactly the
// attribute `Switch.Root` (`role="switch"`) sets, so no styling glue is needed). Standalone here
// so a second consumer (e.g. a settings row) doesn't hand-roll the same `Field.Root` +
// `Switch.Root` + `Field.Label` wiring a second time — a bare `<label>` around a non-native
// `role="switch"` element does not get click-to-toggle/`aria-labelledby` for free the way it did
// for the old hand-rolled checkbox.
export function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <BaseField.Root className={cn('flex items-center gap-2', className)}>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        className="toggle"
      />
      {label ? (
        <BaseField.Label className="text-soft cursor-pointer font-mono text-xs">
          {label}
        </BaseField.Label>
      ) : null}
    </BaseField.Root>
  );
}
