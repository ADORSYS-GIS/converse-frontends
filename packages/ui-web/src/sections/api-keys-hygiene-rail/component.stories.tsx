import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RailPanel } from '../../components/rail-panel';
import { API_KEYS_HYGIENE_RAIL_LABEL, ApiKeysHygieneRail } from './component';
import { apiKeysCleanHygiene, apiKeysHygiene } from './fixtures';

const meta: Meta<typeof ApiKeysHygieneRail> = {
  title: 'Sections/ApiKeysHygieneRail',
  component: ApiKeysHygieneRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysHygieneRail>;

function InRailPanel({ hygiene }: { hygiene: typeof apiKeysHygiene }) {
  return (
    <div className="w-[280px] bg-surface">
      <RailPanel label={API_KEYS_HYGIENE_RAIL_LABEL}>
        <ApiKeysHygieneRail hygiene={hygiene} />
      </RailPanel>
    </div>
  );
}

export const Populated: Story = { render: () => <InRailPanel hygiene={apiKeysHygiene} /> };

// Nothing to report — the section renders nothing rather than an "all clear" placard.
export const Clean: Story = { render: () => <InRailPanel hygiene={apiKeysCleanHygiene} /> };
