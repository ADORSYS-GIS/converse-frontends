import type { PressableProps, ViewProps } from 'react-native';

import type { DivVariantProps } from './cva';

export type DivProps = (ViewProps | PressableProps) & DivVariantProps;
