import React from 'react';
import { Checkbox as ExpoCheckbox } from 'expo-checkbox';
import type { CheckboxProps as ExpoCheckboxProps } from 'expo-checkbox';

import { cn } from '../../cn';
import { checkboxVariants } from './cva';
import type { CheckboxProps } from './types';

const CheckboxBase = ExpoCheckbox as React.ComponentType<
  ExpoCheckboxProps & { className?: string }
>;

export function Checkbox({ size, disabled, value, ...props }: CheckboxProps) {
  const resolvedValue = Boolean(value);
  const resolvedDisabled = Boolean(disabled);

  return (
    <CheckboxBase
      value={resolvedValue}
      disabled={resolvedDisabled}
      className={cn(
        checkboxVariants({
          size,
          checked: resolvedValue,
          disabled: resolvedDisabled,
        }),
      )}
      {...props}
    />
  );
}
