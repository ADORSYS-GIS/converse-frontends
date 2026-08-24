import React from 'react';

import { cn } from '../../cn';
import { statusTextVariants } from './cva';
import type { StatusTextProps } from './types';

export function StatusText({ tone, className, ...props }: StatusTextProps) {
  return <span className={cn(statusTextVariants({ tone }), className)} {...props} />;
}
