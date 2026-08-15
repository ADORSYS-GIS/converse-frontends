import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Stack } from '../stack';
import { toolbarVariants } from './cva';
import type { ToolbarProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

/**
 * Horizontal action bar for the space above a list or table — search/filters
 * on the left, primary/secondary actions on the right. Unlike PageHeader and
 * Pagination this is not page-level chrome: it lives inside a page's content
 * column (a Card, a Page body), so it doesn't own its own max-width centering.
 */
export function Toolbar({ leading, trailing, border, style, ...props }: ToolbarProps) {
  return (
    <ViewBase className={cn(toolbarVariants({ border }))} style={style} {...props}>
      <Stack direction="row" align="center" gap="sm" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
        {leading}
      </Stack>
      {trailing ? (
        <Stack direction="row" align="center" gap="sm" wrap="wrap">
          {trailing}
        </Stack>
      ) : null}
    </ViewBase>
  );
}
