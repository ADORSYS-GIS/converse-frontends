import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import { Field as BaseField } from '@base-ui/react/field';
import React from 'react';

import { cn } from '../../cn';
import type { CheckboxGroupProps, CheckboxProps } from './types';

// PRIMITIVE-MATRIX row 48. Base UI owns the behaviour, daisy's `checkbox` class owns the paint —
// the `<Switch.Root className="toggle">` pairing already proven in `report-export-panel`, and for
// the same reason it works there: daisy's `.checkbox` matches `:checked` OR `[aria-checked=true]`,
// and `[aria-checked]` is exactly what Base UI's `role="checkbox"` element sets. `--depth: 0` and
// `--noise: 0` flatten daisy's inset shadow and grain to nothing, and `--radius-selector: 2px`
// gives the square 2px corner, so none of that needs overriding.
//
// THREE of daisy's own selectors cannot match, and this is the difference from the toggle:
// `Checkbox.Root` renders a `<span>` (plus a hidden `<input>` beside it for form submission), so
// daisy's `.checkbox:indeterminate` and `.checkbox:disabled` — both pseudo-classes only a real
// form control can match — are dead against it, and `.checkbox:focus-visible`'s outline resolves
// to `currentColor`, which is the MARK colour and disappears against the panel once ticked. Those
// three are re-pointed below at the `data-*` attributes Base UI does set. Everything else daisy
// draws is left alone.
//
// The `checkbox-primary` modifier is deliberately NOT used: it sets `--input-color` unconditionally,
// which daisy reads for the BORDER in every state, so an untouched box would sit there wearing an
// orange outline. Orange marks the ticked state only.
const CHECKBOX_CLASS = cn(
  'checkbox checkbox-sm',
  // Unchecked, the box is a control border like every other control's — daisy's default is a 20%
  // tint of the body colour, which is not a token we have.
  'border-border',
  // `primary` fill with a `primary-content` mark once ticked (daisy paints the mark with
  // `currentColor`), and the same fill for the mixed state.
  'data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-content',
  'data-[indeterminate]:border-primary data-[indeterminate]:bg-primary data-[indeterminate]:text-primary-content',
  // daisy's `:indeterminate` bar, re-pointed at `data-indeterminate`: same clip-path, rotation and
  // offset it applies to a native input, because the shape is daisy's to own — only the selector
  // that reaches it is ours.
  'data-[indeterminate]:before:opacity-100 data-[indeterminate]:before:[rotate:0deg]',
  'data-[indeterminate]:before:[translate:0_-35%]',
  'data-[indeterminate]:before:[clip-path:polygon(20%_100%,20%_80%,50%_80%,50%_80%,80%_80%,80%_100%)]',
  // Focus is the console's `primary` ring, not daisy's `currentColor` outline.
  'focus-visible:outline-primary',
  // `disabled:` is dead against a span; and 60% is the opacity every other disabled control here
  // uses (`fieldControlClassName`), not daisy's 20%.
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60'
);

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
      className={CHECKBOX_CLASS}
    />
  );

  // A bare box (a ledger row's select cell) needs no field wiring — it carries its own label.
  if (label === undefined) {
    return className ? <span className={className}>{box}</span> : box;
  }

  // `Field.Root` + `Field.Label`, not a plain `<label>`: a bare `<label>` wrapping a non-native
  // `role="checkbox"` element gets neither the click-to-tick nor the `aria-labelledby` association
  // that a native input would have given it for free (same reasoning as the toggle in
  // `report-export-panel`).
  return (
    <BaseField.Root className={cn('flex items-center gap-2', className)}>
      {box}
      <BaseField.Label className="text-soft cursor-pointer font-mono text-xs">
        {label}
      </BaseField.Label>
    </BaseField.Root>
  );
}

/**
 * A set of checkboxes sharing one `string[]` value — what `manage-filters-rail` needs to express
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
