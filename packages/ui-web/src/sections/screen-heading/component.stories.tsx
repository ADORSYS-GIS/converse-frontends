import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import { SectionSheetTrigger } from '../../components/section-sheet-trigger';
import { ScreenHeading } from './component';

const meta: Meta<typeof ScreenHeading> = {
  title: 'Sections/ScreenHeading',
  component: ScreenHeading,
};

export default meta;
type Story = StoryObj<typeof ScreenHeading>;

export const Default: Story = {
  args: { title: 'Overview', subline: 'adorsys-gis · last 30 days · UTC' },
};

export const WithActions: Story = {
  render: () => (
    <ScreenHeading
      title="Api-Keys"
      subline="adorsys-gis / gateway-prod"
      sublineActions={
        <SectionSheetTrigger icon="scope" triggerLabel="Open scope" label="Scope">
          <p className="font-mono text-xs text-ink">gateway-prod</p>
        </SectionSheetTrigger>
      }
      actions={
        <Button type="button" variant="primary" className="lg:hidden">
          + New key
        </Button>
      }
    />
  ),
};

export const TitleOnly: Story = { args: { title: 'Projects' } };
