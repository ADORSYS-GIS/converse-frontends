import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldCommonProps = {
  /** Label rendered above the control. */
  label: string;
  /** When set, the control's border switches to `primary` and this text renders as a `meta` error line. */
  error?: string;
  /** Wrapper className — for spacing between fields, not for styling the control itself. */
  containerClassName?: string;
  /**
   * `stacked` (default) puts the label above a full-width control. `inline` puts it beside the
   * control, for a horizontal toolbar — the same axis `SelectField` carries, so a toolbar can
   * align every one of its labels identically. Mixing the two in one row is the layout bug this
   * exists to prevent (owner screenshot, 2026-08-29: project label beside its select, status and
   * search labels above theirs, three baselines in one strip).
   *
   * `inline` is unavailable with `multiline` — a label beside a textarea has nothing to align to.
   */
  layout?: 'stacked' | 'inline';
  /**
   * Visually hides the label (`sr-only`) while keeping it as the control's real accessible name
   * (phase 9 — a controls strip's fields self-describe through their own value/placeholder now;
   * the label stays for screen readers, same idiom `SelectField`/`DateRangeField` share).
   */
  hideLabel?: boolean;
};

export type FieldInputProps = FieldCommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    multiline?: false;
    id?: string;
  };

export type FieldTextareaProps = FieldCommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
    multiline: true;
    id?: string;
  };

export type FieldProps = FieldInputProps | FieldTextareaProps;
