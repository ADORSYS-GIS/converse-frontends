import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScopeSelect } from './component';
import type { ScopeSelectValue } from './types';

const accounts = [
  { id: 'adorsys-gis', label: 'adorsys-gis' },
  { id: 'adorsys-labs', label: 'adorsys-labs' },
  { id: 'adorsys-emea', label: 'adorsys-emea' },
];

const projects = [
  { id: 'gateway-prod', label: 'gateway-prod', accountId: 'adorsys-gis' },
  { id: 'gateway-edge', label: 'gateway-edge', accountId: 'adorsys-gis' },
  { id: 'batch-eval', label: 'batch-eval', accountId: 'adorsys-gis' },
  { id: 'support-copilot', label: 'support-copilot', accountId: 'adorsys-labs' },
  { id: 'voice-transcribe', label: 'voice-transcribe', accountId: 'adorsys-labs' },
  { id: 'translate-batch', label: 'translate-batch', accountId: 'adorsys-emea' },
];

const meta: Meta<typeof ScopeSelect> = {
  title: 'Primitives/Fields/ScopeSelect',
  component: ScopeSelect,
};

export default meta;
type Story = StoryObj<typeof ScopeSelect>;

function Demo({ initial }: { initial: ScopeSelectValue }) {
  const [value, setValue] = useState<ScopeSelectValue>(initial);
  return (
    <div className="w-[248px]">
      <ScopeSelect accounts={accounts} projects={projects} value={value} onChange={setValue} />
    </div>
  );
}

export const Default: Story = {
  render: () => <Demo initial={{ accountId: 'adorsys-gis', projectId: 'gateway-prod' }} />,
};

export const NoProjectSelected: Story = {
  render: () => <Demo initial={{ accountId: 'adorsys-gis', projectId: null }} />,
};

export const AccountWithFewerProjects: Story = {
  render: () => <Demo initial={{ accountId: 'adorsys-emea', projectId: 'translate-batch' }} />,
};
