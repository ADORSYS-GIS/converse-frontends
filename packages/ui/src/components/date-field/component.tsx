import React from 'react';

import { cn } from '../../cn';
import { textFieldVariants } from '../text-field/cva';
import type { DateFieldProps } from './types';

// Web-first primitive, mirroring `Select` (see its component.tsx for the fuller rationale):
// this app is pure react-native-web, so the most accessible, keyboard- and screen-reader-
// friendly date input is a real DOM `<input type="date">` -- every evergreen browser renders
// its own native calendar affordance for it, with zero added dependency. `React.createElement`
// with an intrinsic 'input' tag sidesteps the same react-native-web typing gap Select's comment
// documents (react-native-web@0.21.2 ships no TypeScript declarations for
// `unstable_createElement`).
//
// Deliberately reuses `textFieldVariants` as-is (no extra `appearance-none`/caret-spacing layer
// like `Select` adds): browsers render their own calendar-icon affordance inside a date input,
// and stripping native appearance would hide that icon rather than just restyling a caret.
export function DateField({
  value,
  onValueChange,
  min,
  max,
  disabled,
  size,
  accessibilityLabel,
}: DateFieldProps) {
  return React.createElement('input', {
    type: 'date',
    value: value ?? '',
    min,
    max,
    disabled,
    'aria-label': accessibilityLabel,
    className: cn(textFieldVariants({ size })),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onValueChange?.(event.target.value),
  });
}
