import type React from 'react';

export interface CheckboxProps {
  /** Identifies the box inside a `CheckboxGroup`. Also the form field name. */
  name?: string;
  /**
   * The label beside the box. Omit for a bare box (a ledger row's select-this-row cell), and give
   * that one an `aria-label` instead.
   */
  label?: React.ReactNode;
  'aria-label'?: string;
  /** Controlled tick state. Leave undefined inside a `CheckboxGroup`, which owns it. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /**
   * Neither ticked nor unticked — a parent whose children are partly selected. Set it yourself
   * for a standalone box; inside a `CheckboxGroup` with `allValues`, a `parent` box derives it.
   */
  indeterminate?: boolean;
  disabled?: boolean;
  /**
   * Whether this box controls every other box in its `CheckboxGroup` ("Select all"). Requires
   * `allValues` on the group, which is what makes the mixed state derived rather than computed by
   * the caller.
   */
  parent?: boolean;
  /** Applied to the row (box + label), not the box. */
  className?: string;
}

export interface CheckboxGroupProps {
  /** The names of the boxes that are ticked. */
  value: string[];
  onValueChange: (value: string[]) => void;
  /**
   * Every name the group contains, in order. Required only when the group holds a `parent` box —
   * it is what lets Base UI derive the parent's ticked/mixed/unticked state and its click
   * behaviour (tick all, then clear all).
   */
  allValues?: string[];
  disabled?: boolean;
  /** Names the set for assistive technology. Renders as a `<div role="group">`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children: React.ReactNode;
  className?: string;
}
