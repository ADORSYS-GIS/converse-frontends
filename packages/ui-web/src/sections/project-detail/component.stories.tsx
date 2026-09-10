import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProjectDetail } from './component';
import { selectedProjectFixture, suspendedProjectFixture } from './fixtures';

const meta: Meta<typeof ProjectDetail> = {
  title: 'Sections/Account/ProjectDetail',
  component: ProjectDetail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProjectDetail>;

// `DetailSheet`'s body — 420px wide, 20px inset — is this section's only real host; the wrapper
// below matches it rather than an arbitrary demo width.
function InSheetBody({ project }: { project: typeof selectedProjectFixture }) {
  return (
    <div className="bg-surface w-[420px] p-5">
      <ProjectDetail project={project} />
    </div>
  );
}

export const RowSelected: Story = {
  render: () => <InSheetBody project={selectedProjectFixture} />,
};

export const SuspendedRowSelected: Story = {
  render: () => <InSheetBody project={suspendedProjectFixture} />,
};
