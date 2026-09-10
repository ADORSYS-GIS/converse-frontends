import { Select } from '@base-ui/react/select';
import React, { useId } from 'react';

import { cn } from '../../cn';
import { fieldControlClassName, fieldLabelClassName } from '../field/field-classes';
import {
  OVERLAY_ANCHORED_POPUP_FLOATING_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_POSITIONER_CLASS,
} from '../../lib/overlay';
import { LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
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
//
// THE canonical select primitive (issue #368, unify-select): every single-value picker in the
// console — a toolbar range/bucket/group-by control, a dialog's plan picker, `ScopeSelect`'s two
// cascaded pickers — renders THIS component, never a second hand-rolled `Select.Root` tree. Two
// call sites (`CreateApiKeyDialog`, `CreateProjectDialog`) used to hand-roll their own billing-
// plan `Select.Root` because the ONLY thing this component lacked was a way to disable the whole
// control while its catalogue loads — `disabled` below is that missing piece, not a reason to
// keep a second implementation. `error` mirrors `Field`'s own `error?: string` contract (border to
// `primary`, a `meta` line underneath) so a `SelectField` reads as a `Field` sibling rather than a
// control with its own rules.
export function SelectField({
  label,
  value,
  options,
  onChange,
  layout = 'stacked',
  hideLabel,
  disabled,
  error,
  example,
  className,
}: SelectFieldProps) {
  const inline = layout === 'inline';
  const generatedId = useId();
  const errorId = error ? `${generatedId}-error` : undefined;
  const exampleId = example && !inline ? `${generatedId}-example` : undefined;
  const describedBy = [exampleId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <Select.Root
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => next !== null && onChange(next)}>
      <div className={cn(inline ? 'label' : 'fieldset', className)}>
        <Select.Label className={hideLabel ? 'sr-only' : fieldLabelClassName}>{label}</Select.Label>
        {exampleId ? (
          <p id={exampleId} className={META_CLASS}>
            {example}
          </p>
        ) : null}
        <Select.Trigger
          className={fieldControlClassName}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}>
          <Select.Value />
          <Select.Icon>
            <Chevron />
          </Select.Icon>
        </Select.Trigger>
        {error ? (
          <p id={errorId} className={cn(LABEL_CLASS, 'text-primary')}>
            {error}
          </p>
        ) : null}
      </div>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className={OVERLAY_POSITIONER_CLASS}>
          <Select.Popup className={OVERLAY_ANCHORED_POPUP_FLOATING_CLASS}>
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  title={option.reason}
                  // `select-field-item` (theme.css): the palette-matching 36px row rhythm (owner
                  // ask, 2026-08-31 — "same overlay language as the palette ... row height"),
                  // scoped to THIS popup's own row rather than the shared `OVERLAY_ITEM_CLASS`
                  // every other Menu/Select/Combobox popup in the console also renders through.
                  className={cn(OVERLAY_ITEM_CLASS, 'select-field-item')}>
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
