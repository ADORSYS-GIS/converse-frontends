import React from 'react';
import { Card, Stack, Text, Div } from '@lightbridge/ui';

interface UsageKpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'brand';
  tone?: 'muted' | 'brandSoft' | 'accentSoft' | 'successSoft';
}

export function UsageKpiCard({ label, value, icon, variant = 'default', tone = 'muted' }: UsageKpiCardProps) {
  const isBrand = variant === 'brand';

  if (isBrand) {
    return (
      <Div 
        tone="brand" 
        rounded="xl" 
        shadow="lg" 
        pad="lg" 
        width="full"
      >
        <Stack gap="md">
          <Stack direction="row" justify="between" align="center" width="full">
            <Text intent="inverseBodyStrong">{label}</Text>
            {icon}
          </Stack>
          <Stack gap="xs">
            <Text intent="inverseValue">{value}</Text>
          </Stack>
        </Stack>
      </Div>
    );
  }

  return (
    <Card size="sm" style={{ flexBasis: '47%', flexGrow: 1, minHeight: 116 }}>
      <Stack gap="sm" justify="between" style={{ flex: 1 }}>
        {icon && (
          <Div
            tone={tone}
            rounded="xl"
            size="iconLg"
            align="center"
            justify="center"
            style={{ flexShrink: 0 }}>
            {icon}
          </Div>
        )}
        <Stack gap="none">
          <Text intent="eyebrow">{label}</Text>
          <Text intent="bodyStrong" numberOfLines={1}>{value}</Text>
        </Stack>
      </Stack>
    </Card>
  );
}
