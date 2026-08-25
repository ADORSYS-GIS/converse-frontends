import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { CommandPalette, CommandPaletteTrigger } from './component';
import type { CommandPaletteGroup } from './types';

/** Mirrors the real groups the console-ui skill's palette contract names: Navigate then Actions. */
function exampleGroups(onSelect: (key: string) => void): CommandPaletteGroup[] {
  return [
    {
      key: 'navigate',
      heading: 'Navigate',
      items: [
        { key: 'overview', label: 'Overview', onSelect: () => onSelect('overview') },
        { key: 'api-keys', label: 'Api-Keys', onSelect: () => onSelect('api-keys') },
        { key: 'manage', label: 'Manage', onSelect: () => onSelect('manage') },
        { key: 'admin', label: 'Admin', onSelect: () => onSelect('admin'), hint: 'ROLE' },
      ],
    },
    {
      key: 'actions',
      heading: 'Actions',
      items: [
        { key: 'new-key', label: 'New key', onSelect: () => onSelect('new-key') },
        { key: 'generate-report', label: 'Generate report', onSelect: () => onSelect('generate-report') },
        { key: 'request-refill', label: 'Request refill', onSelect: () => onSelect('request-refill') },
        { key: 'sign-out', label: 'Sign out', onSelect: () => onSelect('sign-out') },
      ],
    },
  ];
}

function ControlledPalette({
  initialOpen,
  onSelect,
}: {
  initialOpen: boolean;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <CommandPaletteTrigger onClick={() => setOpen(true)} />
      <CommandPalette open={open} onOpenChange={setOpen} groups={exampleGroups(onSelect)} />
    </>
  );
}

/** Echoes the last selected item's key below the palette, so the keyboard-only story can assert on it. */
function KeyboardOnlyNavigationHarness() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <ControlledPalette initialOpen onSelect={setSelected} />
      <p style={{ color: '#eee', fontFamily: 'monospace', fontSize: 11, marginTop: 12 }}>
        selected: {selected ?? '—'}
      </p>
    </>
  );
}

const meta: Meta<typeof CommandPalette> = {
  title: 'Forms & actions/CommandPalette',
  component: CommandPalette,
  decorators: [
    (Story) => (
      <div style={{ background: '#000', minHeight: 240, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

export const Closed: Story = {
  render: () => <ControlledPalette initialOpen={false} onSelect={fn()} />,
};

export const Open: Story = {
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
};

export const Filtering: Story = {
  name: 'Typing filters both groups down to matches',
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText('Jump to a page or run an action…'), 'key');

    await waitFor(() => {
      expect(canvas.getByText('Api-Keys')).toBeInTheDocument();
      expect(canvas.getByText('New key')).toBeInTheDocument();
    });
    expect(canvas.queryByText('Manage')).not.toBeInTheDocument();
    expect(canvas.queryByText('Sign out')).not.toBeInTheDocument();
  },
};

export const NoResults: Story = {
  name: 'An unmatched query shows the empty message, not an empty list',
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByPlaceholderText('Jump to a page or run an action…'),
      'nonexistent-command',
    );

    await waitFor(() => expect(canvas.getByText('No matches.')).toBeInTheDocument());
  },
};

export const KeyboardOnlyNavigation: Story = {
  name: 'Arrow keys move selection, Enter fires the selected item — no pointer involved',
  render: () => <KeyboardOnlyNavigationHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Jump to a page or run an action…');
    await userEvent.click(input);
    // First item (Overview) is selected by default; move down to Api-Keys.
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(canvas.getByText('selected: api-keys')).toBeInTheDocument());
    // Selecting an item closes the palette (onOpenChange(false) before onSelect).
    expect(canvas.queryByPlaceholderText('Jump to a page or run an action…')).not.toBeInTheDocument();
  },
};

export const EscapeCloses: Story = {
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByPlaceholderText('Jump to a page or run an action…')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(canvas.queryByPlaceholderText('Jump to a page or run an action…')).not.toBeInTheDocument(),
    );
  },
};
