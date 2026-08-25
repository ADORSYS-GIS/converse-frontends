import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';
import { SelectionSheet } from './component';

const meta: Meta<typeof SelectionSheet> = {
  title: 'Shell/SelectionSheet',
  component: SelectionSheet,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SelectionSheet>;

function Demo() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <Button type="button" variant="secondary" onClick={() => setSelected('gateway-prod')}>
        Select gateway-prod
      </Button>
      <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
        Clear selection
      </Button>
      <SelectionSheet selectionKey={selected} label="SELECTION">
        <p className="font-mono text-xs text-ink">{selected ?? 'No rows selected.'}</p>
      </SelectionSheet>
    </div>
  );
}

// Selection-driven: no trigger button exists at all, the sheet follows the selection. Only
// meaningful below `lg`, where the right rail is not rendered.
export const CompactTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <Demo />,
};
