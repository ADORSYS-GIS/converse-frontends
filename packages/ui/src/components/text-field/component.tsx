import React from 'react';
import { TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';

import { cn } from '../../cn';
import { textFieldVariants } from './cva';
import type { TextFieldProps } from './types';

const InputBase = TextInput as React.ComponentType<TextInputProps & { className?: string }>;

export function TextField({ size, ...props }: TextFieldProps) {
  return <InputBase className={cn(textFieldVariants({ size }))} {...props} />;
}
