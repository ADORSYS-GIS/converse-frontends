import React from 'react';

import { cn } from '../../cn';
import { textFieldVariants } from '../text-field/cva';
import { selectVariants } from './cva';
import type { SelectProps } from './types';

// Web-first primitive: this app is pure react-native-web, so the most accessible,
// keyboard- and screen-reader-friendly dropdown is a real DOM `<select>`.
//
// Implementation note: react-native-web exposes `unstable_createElement` for exactly
// this (rendering a raw DOM tag inside RN-web), but react-native-web@0.21.2 ships NO
// TypeScript declarations, so importing from it fails `tsc` in both `@lightbridge/ui`
// and every app that reaches `Select` through the barrel. `React.createElement` with
// an intrinsic `'select'` tag is fully typed, needs no ambient module shim, and — on
// react-native-web (which renders through react-dom) — produces the identical DOM
// element. The `className` carries the shared TextField chrome (`textFieldVariants`),
// which the web build compiles to real Tailwind CSS.
export function Select({ value, onValueChange, options, placeholder, disabled, size }: SelectProps) {
  return React.createElement(
    'select',
    {
      value: value ?? '',
      disabled,
      className: cn(textFieldVariants({ size }), selectVariants()),
      onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
        onValueChange?.(event.target.value),
    },
    placeholder
      ? React.createElement(
          'option',
          { key: '__placeholder', value: '', disabled: true },
          placeholder
        )
      : null,
    options.map((option) =>
      React.createElement('option', { key: option.value, value: option.value }, option.label)
    )
  );
}
