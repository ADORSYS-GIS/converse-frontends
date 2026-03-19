import type { ReactNode } from 'react';
import type { PressableProps, TextProps } from 'react-native';

import type { ButtonVariantProps } from './cva';

export type ButtonProps = PressableProps &
  ButtonVariantProps & {
    textProps?: TextProps;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
    children?: ReactNode;
  };
