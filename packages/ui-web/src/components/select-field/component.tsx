import { Select } from '@base-ui/react/select';
import React from 'react';

import { cn } from '../../cn';
import { fieldControlClassName, fieldLabelClassName } from '../field/field-classes';
import {
  OVERLAY_ANCHORED_POPUP_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_POSITIONER_CLASS,
} from '../../lib/overlay';
import { Chevron } from '../chevron';
import type { SelectFieldProps } from './types';

// Base UI Select (ADR 0010 Decision 2). Never a native select + an appearance-none override: the native
// popup cannot be themed, ignores our tokens entirely, and renders as OS chrome in the middle of
// the console — which is what it was doing until 2026-08-29.
//
// The trigger wears the SAME `input` class Field's text control wears, so "a select looks like a
// field" is a fact about one CSS block rather than a resemblance two components have to keep up
// by hand. `theme.css` gives a `button.input` the pointer cursor and the space-between row its
// chevron needs, and `.label > button.input` the content width the inline layout wants — so the
// two layouts here are a wrapper class each and nothing else.
export function SelectField({
  label,
  value,
  options,
  onChange,
  layout = 'stacked',
  hideLabel,
  className,
}: SelectFieldProps) {
  const inline = layout === 'inline';

  return (
    <Select.Root
      items={options}
      value={value}
      onValueChange={(next) => next !== null && onChange(next)}>
      <div className={cn(inline ? 'label' : 'fieldset', className)}>
        <Select.Label className={hideLabel ? 'sr-only' : fieldLabelClassName}>{label}</Select.Label>
        <Select.Trigger className={fieldControlClassName}>
          <Select.Value />
          <Select.Icon>
            <Chevron />
          </Select.Icon>
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className={OVERLAY_POSITIONER_CLASS}>
          <Select.Popup className={OVERLAY_ANCHORED_POPUP_CLASS}>
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  title={option.reason}
                  className={OVERLAY_ITEM_CLASS}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
