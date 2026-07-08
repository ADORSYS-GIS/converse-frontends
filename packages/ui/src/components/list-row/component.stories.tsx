import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Badge } from '../badge';
import { Button } from '../button';
import { Card } from '../card';
import { Stack } from '../stack';
import { Text } from '../text';
import { ListRow } from './component';

const meta: Meta<typeof ListRow> = {
  title: 'UI/ListRow',
  component: ListRow,
  decorators: [
    (Story) => (
      <div style={{ width: 460 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListRow>;

export const TitleSubtitle: Story = {
  args: {
    tone: 'surface',
    pad: 'md',
    rounded: 'xl',
    title: 'Production key',
    subtitle: 'lb_prod_••••1jqr',
  },
};

export const WithTrailingAction: Story = {
  args: {
    tone: 'surface',
    pad: 'md',
    rounded: 'xl',
    title: 'Production key',
    subtitle: 'Created Jan 29, 2025',
    trailing: (
      <Button variant="ghost" size="sm">
        Delete
      </Button>
    ),
  },
};

export const NodeTitleWithBadge: Story = {
  render: () => (
    <Card size="md">
      <ListRow
        title={
          <Stack direction="row" align="center" gap="sm">
            <Text intent="bodyStrong">Default key</Text>
            <Badge tone="success">active</Badge>
          </Stack>
        }
        subtitle="lb_live_••••WIKC"
        trailing={
          <Button variant="ghost" size="sm">
            Delete
          </Button>
        }
      />
    </Card>
  ),
};
