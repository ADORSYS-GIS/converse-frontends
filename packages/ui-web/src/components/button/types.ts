import type { ButtonHTMLAttributes } from 'react';

import type { ButtonVariantProps } from './cva';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps;
