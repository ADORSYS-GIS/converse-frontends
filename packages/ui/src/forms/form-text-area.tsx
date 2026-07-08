/**
 * Connected multiline text area — the react-hook-form-wired sibling of the connected
 * `FormField` (see ./form-field.tsx). Composes the presentational `FormField` shell
 * (aliased `FieldShell`) around a multiline `TextField`.
 */
import React from 'react';
import { useController } from 'react-hook-form';

import { FormField as FieldShell } from '../components/form-field';
import { TextField } from '../components/text-field';
import type { TextFieldProps } from '../components/text-field';

export type FormTextAreaProps = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'multiline'
> & {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  numberOfLines?: number;
};

export function FormTextArea({
  name,
  label,
  description,
  numberOfLines = 4,
  style,
  ...props
}: FormTextAreaProps) {
  const { field, fieldState } = useController({ name });

  return (
    <FieldShell label={label} description={description} error={fieldState.error?.message}>
      <TextField
        multiline
        numberOfLines={numberOfLines}
        textAlignVertical="top"
        value={field.value ?? ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        style={[{ minHeight: 96 }, style]}
        {...props}
      />
    </FieldShell>
  );
}
