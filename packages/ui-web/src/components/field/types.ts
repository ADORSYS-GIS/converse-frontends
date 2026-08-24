import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldCommonProps = {
  /** Label rendered above the control. */
  label: string;
  /** When set, the control's border switches to `primary` and this text renders as a `meta` error line. */
  error?: string;
  /** Wrapper className — for spacing between fields, not for styling the control itself. */
  containerClassName?: string;
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
