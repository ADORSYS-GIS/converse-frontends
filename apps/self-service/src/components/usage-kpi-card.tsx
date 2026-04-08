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
    <Stack gap="sm" flex="grow" style={{ width: '100%', minWidth: '100%' }}>
      <Stack direction="row" align="center" justify="between" style={{ width: '100%' }}>
        <Text intent={isBrand ? 'inverseEyebrow' : 'eyebrow'}>{label}</Text>
        {icon && (
           <Div 
            tone={isBrand ? 'brandSoft' : 'muted'} 
            rounded="full" 
            size="iconSm" 
            align="center" 
            justify="center"
            style={isBrand ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : undefined}
          >
            {icon}
          </Div>
        )}
      </Stack>
      <Text intent={isBrand ? 'inverseValue' : 'value'} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
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
