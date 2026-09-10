import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailResizer } from './component';

const meta: Meta<typeof RailResizer> = {
  title: 'Shell/RailResizer',
  component: RailResizer,
};

export default meta;
type Story = StoryObj<typeof RailResizer>;

function Demo() {
  const [width, setWidth] = useState(280);
  return (
    <div className="flex h-[240px] w-[480px]">
      <div className="bg-muted flex-1" />
      <div
        className="bg-chrome border-raised relative flex flex-none items-center justify-center border-l"
        style={{ width }}>
        <span className="text-subtle font-mono text-[11px]">{width}px</span>
        <RailResizer value={width} onChange={setWidth} min={240} max={480} />
      </div>
    </div>
  );
}

// Drag the handle on the panel's left edge, or Tab to it and use the arrow keys / Home / End —
// the WAI-ARIA window-splitter pattern this component implements in full.
export const Interactive: Story = {
  render: () => <Demo />,
};
