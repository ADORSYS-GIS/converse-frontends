import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import { Field as BaseField } from '@base-ui/react/field';
import React from 'react';

import { cn } from '../../cn';
import type { CheckboxGroupProps, CheckboxProps } from './types';

// PRIMITIVE-MATRIX row 48. Base UI owns the behaviour, daisy's `checkbox` class owns the paint —
// the Switch.Root/`toggle` pairing already proven in the report export panel, and for the same
// reason it works there: daisy's box matches `:checked` OR `[aria-checked=true]`, and
// that same attribute is exactly what Base UI's `role="checkbox"` element sets.
//
// The three daisy selectors that cannot match a `<span role="checkbox">` — `:indeterminate`,
// `:disabled`, and a `:focus-visible` outline that resolves to the MARK colour — are re-pointed at
// Base UI's `data-*` attributes ONCE, in the `@utility checkbox` block in `theme.css`, along with
// the reason the checkbox-primary modifier stays unusable. None of it is written here: the box is the class
// name and nothing more.
export function Checkbox({
  name,
  label,
  checked,
  onCheckedChange,
  indeterminate,
  disabled,
  parent,
  className,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  const box = (
    <BaseCheckbox.Root
      name={name}
      checked={checked}
      onCheckedChange={onCheckedChange}
      indeterminate={indeterminate}
      disabled={disabled}
      parent={parent}
      aria-label={label === undefined ? ariaLabel : undefined}
      className="checkbox"
    />
  );

  // A bare box (a ledger row's select cell) needs no field wiring — it carries its own label.
  if (label === undefined) {
    return className ? <span className={className}>{box}</span> : box;
  }

  // `Field.Root` + `Field.Label`, not a plain `<label>`: a bare `<label>` wrapping a non-native
  // `role="checkbox"` element gets neither the click-to-tick nor the aria-labelledby association
  // that a native input would have given it for free (same reasoning as the toggle in
  // the report export panel). daisy's `label` is the row: box beside its text, 8px gap, pointer
  // cursor because it contains a control that the whole row toggles, and the 12px mono the label
  // text wants — all from `theme.css`, so the text element itself carries no class at all.
  return (
    <BaseField.Root className={cn('label', className)}>
      {box}
      <BaseField.Label>{label}</BaseField.Label>
    </BaseField.Root>
  );
}

/**
 * A set of checkboxes sharing one `string[]` value — what the manage filters rail needs to express
 * multi-select filtering, and the shape a nuqs array param already has.
 *
 * It earns its own primitive rather than being a `.map()` over `Checkbox` because of `allValues`:
 * with it, a `parent` box's ticked / mixed / unticked state is DERIVED from its children, and
 * clicking it ticks or clears them all. Hand-rolling that means the caller computing
 * `value.length > 0 && value.length < all.length` at every call site and re-implementing the
 * clear-all toggle — which is exactly the kind of behaviour ADR 0010 says not to reimplement.
 */
export function CheckboxGroup({
  value,
  onValueChange,
  allValues,
  disabled,
  children,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: CheckboxGroupProps) {
  return (
    <BaseCheckboxGroup
      value={value}
      onValueChange={(next) => onValueChange(next)}
      allValues={allValues}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn('flex flex-col gap-2', className)}>
      {children}
    </BaseCheckboxGroup>
  );
}
