import React from 'react';
import { Card, Stack, Text, Div } from '@lightbridge/ui';

interface UsageKpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'brand';
}

export function UsageKpiCard({ label, value, icon, variant = 'default' }: UsageKpiCardProps) {
  const isBrand = variant === 'brand';

  const content = (
    <Stack gap="md" justify="between" style={{ flex: 1, minHeight: 96 }}>
      {icon && (
        <Div 
          tone={isBrand ? 'brandSoft' : 'muted'} 
          rounded="xl" 
          size="iconLg" 
          align="center" 
          justify="center"
          style={{ flexShrink: 0, ...(isBrand ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}) }}
        >
          {icon}
        </Div>
      )}
      <Stack gap="xs">
        <Text intent={isBrand ? 'inverseEyebrow' : 'eyebrow'}>{label}</Text>
        <Text intent={isBrand ? 'inverseValue' : 'value'} numberOfLines={1} ellipsizeMode="tail">
          {value}
        </Text>
      </Stack>
    </Stack>
  );

  if (isBrand) {
    return (
      <Div 
        tone="brand" 
        rounded="xl" 
        shadow="lg" 
        pad="lg" 
        style={{ flexGrow: 1, flexBasis: '30%', minWidth: 140 }}
      >
        {content}
      </Div>
    );
  }

  return (
    <Card size="md" style={{ flexGrow: 1, flexBasis: '30%', minWidth: 140 }}>
      {content}
    </Card>
  );
}
