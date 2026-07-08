import React from 'react';
import { Checkbox as ExpoCheckbox } from 'expo-checkbox';
import type { CheckboxProps as ExpoCheckboxProps } from 'expo-checkbox';

import { cn } from '../../cn';
import { checkboxVariants } from './cva';
import type { CheckboxProps } from './types';

const CheckboxBase = ExpoCheckbox as React.ComponentType<
  ExpoCheckboxProps & { className?: string }
>;

// expo-checkbox renders its own control (a native checkbox on the web fallback),
// so NativeWind classes on the wrapper don't reach the checked fill/border — the
// `color` prop is the real styling lever. Default it to the brand primary so the
// checked state reads as intentional instead of the browser-default gray.
const DEFAULT_CHECKBOX_COLOR = '#1d5bff';

export function Checkbox({ size, disabled, value, color, ...props }: CheckboxProps) {
  const resolvedValue = Boolean(value);
  const resolvedDisabled = Boolean(disabled);

  return (
    <CheckboxBase
      value={resolvedValue}
      disabled={resolvedDisabled}
      color={color ?? DEFAULT_CHECKBOX_COLOR}
      className={cn(
        checkboxVariants({
          size,
          checked: resolvedValue,
          disabled: resolvedDisabled,
        })
      )}
      {...props}
    />
  );
}
