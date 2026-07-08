import React from 'react';
import { useController } from 'react-hook-form';

import { Checkbox } from '../components/checkbox';
import { Stack } from '../components/stack';
import { Text } from '../components/text';

export type FormCheckboxProps = {
  name: string;
  label: string;
};

export function FormCheckbox({ name, label }: FormCheckboxProps) {
  const { field, fieldState } = useController({ name });

  return (
    <Stack gap="xs">
      <Stack direction="row" align="center" gap="sm">
        <Checkbox value={Boolean(field.value)} onValueChange={field.onChange} />
        <Text>{label}</Text>
      </Stack>
      {fieldState.error?.message ? <Text intent="danger">{fieldState.error.message}</Text> : null}
    </Stack>
  );
}
