import type { Meta, StoryObj } from '@storybook/react-vite';

import { CommandSnippet } from './component';

const meta: Meta<typeof CommandSnippet> = {
  title: 'Primitives/Actions/CommandSnippet',
  component: CommandSnippet,
  args: {
    command: 'kubectl logs -f lci-run-4f21ac --namespace lightbridge',
  },
};

export default meta;
type Story = StoryObj<typeof CommandSnippet>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'Stream this run’s logs' },
};

export const LongCommand: Story = {
  args: {
    command:
      'kubectl exec -it deploy/lci-control-plane -n lightbridge -- cratestack generate-typescript --schema schema/authz.cstack --out generated',
  },
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
};
