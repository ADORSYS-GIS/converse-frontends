import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { designTokens } from '../../design/tokens';
import { Button } from '../button';
import { Stack } from '../stack';
import { Text } from '../text';
import { paginationVariants } from './cva';
import type { PaginationProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

export function Pagination({
  page,
  canPrev,
  hasMore,
  onPrev,
  onNext,
  pageLabel = 'Page',
  previousLabel = 'Previous',
  nextLabel = 'Next',
  prevIcon,
  nextIcon,
  border,
  style,
  ...props
}: PaginationProps) {
  return (
    <ViewBase
      className={cn(paginationVariants({ border }))}
      style={[
        {
          paddingVertical: 12,
        },
        style,
      ]}
      {...props}>
      {/* Bar spans full width; controls center to the content column so the
          footer aligns with the page header and body on wide screens. */}
      <Stack
        direction="row"
        align="center"
        justify="between"
        width="full"
        style={{
          maxWidth: designTokens.layout.maxContentWidth,
          marginHorizontal: 'auto',
          paddingHorizontal: designTokens.spacing.topBarHorizontal,
        }}>
        <Button
          variant="ghost"
          size="sm"
          onPress={onPrev}
          disabled={!canPrev}
          accessibilityLabel={previousLabel}
          style={{ opacity: canPrev ? 1 : 0.5 }}>
          <Stack direction="row" align="center" gap="xs">
            {prevIcon}
            <Text intent="bodyStrong">{previousLabel}</Text>
          </Stack>
        </Button>

        <Text intent="caption" style={{ fontWeight: '600' }}>
          {pageLabel} {page}
        </Text>

        <Button
          variant="ghost"
          size="sm"
          onPress={onNext}
          disabled={!hasMore}
          accessibilityLabel={nextLabel}
          style={{ opacity: hasMore ? 1 : 0.5 }}>
          <Stack direction="row" align="center" gap="xs">
            <Text intent="bodyStrong">{nextLabel}</Text>
            {nextIcon}
          </Stack>
        </Button>
      </Stack>
    </ViewBase>
  );
}
