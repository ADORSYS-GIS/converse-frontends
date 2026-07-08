import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Stack } from '../stack';
import { Text } from '../text';
import { formFieldVariants } from './cva';
import type { FormFieldProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function FormField({
  label,
  description,
  helper,
  error,
  width,
  children,
  ...props
}: FormFieldProps) {
  return (
    <ViewBase className={cn(formFieldVariants({ width }))} {...props}>
      <Stack gap="xs" width="full">
        {label ? <Text intent="bodyStrong">{label}</Text> : null}
        {description ? <Text intent="caption">{description}</Text> : null}
        {children}
        {error ? (
          <Text intent="danger">{error}</Text>
        ) : helper ? (
          <Text intent="caption">{helper}</Text>
        ) : null}
      </Stack>
    </ViewBase>
  );
}
