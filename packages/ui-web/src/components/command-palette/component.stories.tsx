import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { CommandPalette, CommandPaletteTrigger } from './component';
import type { CommandPaletteGroup } from './types';
import { AdminIcon, KeysIcon, OverviewIcon, ProjectsIcon } from '../../lib/icons';

/**
 * Mirrors the real groups the console-ui skill's palette contract names: Navigate then Actions.
 * Navigate rows carry the same glyph their matching nav row does (`lib/icons.tsx`) -- a
 * deliberate mix of icon and no-icon rows (Actions has none) is included on purpose, since a real
 * palette will mix the two and the icon COLUMN has to stay aligned either way.
 */
function exampleGroups(onSelect: (key: string) => void): CommandPaletteGroup[] {
  return [
    {
      key: 'navigate',
      heading: 'Navigate',
      items: [
        {
          key: 'overview',
          label: 'Overview',
          icon: <OverviewIcon />,
          onSelect: () => onSelect('overview'),
        },
        {
          key: 'api-keys',
          label: 'Api-Keys',
          icon: <KeysIcon />,
          onSelect: () => onSelect('api-keys'),
        },
        {
          key: 'manage',
          label: 'Manage',
          icon: <ProjectsIcon />,
          onSelect: () => onSelect('manage'),
        },
        {
          key: 'admin',
          label: 'Admin',
          icon: <AdminIcon />,
          onSelect: () => onSelect('admin'),
          hint: 'Role',
        },
      ],
    },
    {
      key: 'actions',
      heading: 'Actions',
      items: [
        {
          key: 'new-key',
          label: 'New key',
          shortcut: 'N',
          onSelect: () => onSelect('new-key'),
        },
        {
          key: 'generate-report',
          label: 'Generate report',
          onSelect: () => onSelect('generate-report'),
        },
        {
          key: 'request-refill',
          label: 'Request refill',
          onSelect: () => onSelect('request-refill'),
        },
        { key: 'sign-out', label: 'Sign out', onSelect: () => onSelect('sign-out') },
      ],
    },
  ];
}

/**
 * Adds a populated `Scope` group between `Navigate` and `Actions` — the account-switch ask
 * (console-ui#310/#302) `useConsolePalette` wires for real against `useConsoleScope().allAccounts`.
 * A mix of named and unnamed accounts: an unnamed one renders via the `acct_<first8>` convention
 * `accountScopeLabel` produces, never a raw 36-character UUID.
 */
function exampleGroupsWithScope(onSelect: (key: string) => void): CommandPaletteGroup[] {
  const [navigate, actions] = exampleGroups(onSelect);
  const scope: CommandPaletteGroup = {
    key: 'scope',
    heading: 'Scope',
    items: [
      { key: 'scope-acme', label: 'Acme Corp', onSelect: () => onSelect('scope-acme') },
      { key: 'scope-globex', label: 'Globex Industries', onSelect: () => onSelect('scope-globex') },
      // Unnamed account — `accountScopeLabel`'s `acct_<first8>` fallback, not a raw uuid.
      { key: 'scope-unnamed', label: 'acct_4f21a90c', onSelect: () => onSelect('scope-unnamed') },
    ],
  };
  return [navigate, scope, actions];
}

function ControlledPalette({
  initialOpen,
  onSelect,
  groups = exampleGroups,
  panelClassName,
}: {
  initialOpen: boolean;
  onSelect: (key: string) => void;
  groups?: (onSelect: (key: string) => void) => CommandPaletteGroup[];
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <CommandPaletteTrigger onClick={() => setOpen(true)} />
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        groups={groups(onSelect)}
        panelClassName={panelClassName}
      />
    </>
  );
}

/** Echoes the last selected item's key below the palette, so the keyboard-only story can assert on it. */
function KeyboardOnlyNavigationHarness() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <ControlledPalette initialOpen onSelect={setSelected} />
      <p className="text-ink font-mono text-[11px]" style={{ marginTop: 12 }}>
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
      <div className="bg-muted" style={{ minHeight: 240, padding: 24 }}>
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

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Open`.
export const OpenLight: Story = {
  name: 'Open — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
};

/** Base tier (<600, `CONSOLE_VIEWPORTS.base390`) — the palette owner ask named explicitly: it
 *  still opens as a centred overlay (never a bottom sheet; a command palette is not row detail),
 *  just narrower, so the footer's three hints and a shortcut-bearing row both stay legible. */
export const Mobile: Story = {
  name: 'Open — base tier (390px)',
  globals: { viewport: { value: 'base390' } },
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
};

// The palette-scope ask (console-ui#310/#302): Navigate, then a populated Scope group, then
// Actions — matching the real group order `useConsolePalette` wires.
export const OpenWithScope: Story = {
  name: 'Open — Scope group populated',
  render: () => (
    <ControlledPalette initialOpen onSelect={fn()} groups={exampleGroupsWithScope} />
  ),
};

// `wireframe` (light) counterpart of `OpenWithScope`.
export const OpenWithScopeLight: Story = {
  name: 'Open — Scope group populated, wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => (
    <ControlledPalette initialOpen onSelect={fn()} groups={exampleGroupsWithScope} />
  ),
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
      'nonexistent-command'
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
    expect(
      canvas.queryByPlaceholderText('Jump to a page or run an action…')
    ).not.toBeInTheDocument();
  },
};

export const EscapeCloses: Story = {
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByPlaceholderText('Jump to a page or run an action…')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        canvas.queryByPlaceholderText('Jump to a page or run an action…')
      ).not.toBeInTheDocument()
    );
  },
};

/*
 * ─── Corner-radius comparison (owner review, 2026-08-31) ─────────────────────────────────────
 *
 * "The command palette is uglier even, and the corners are still sharp, breaking with the rest of
 * the app... Do the storybook first and let me approve the screenshot before you wire in." The
 * shared `OVERLAY_CLASS` contract (`rounded-[2px]`, `lib/overlay.ts`) is untouched by this batch —
 * it is the SAME constant every dialog, tooltip, menu and select in the console renders through,
 * so changing it here would silently restyle all of them, not just the palette under review. These
 * three stories instead pass `panelClassName`, a story-only escape hatch
 * (`CommandPaletteProps.panelClassName`) that overrides just THIS panel's own corner radius via
 * `cn()`/`tailwind-merge`, so the owner can pick a value from three otherwise-identical
 * screenshots before anything is decided for real.
 */
export const RadiusComparison2px: Story = {
  name: 'Radius comparison — 2px (current contract, unchanged)',
  render: () => <ControlledPalette initialOpen onSelect={fn()} />,
};

export const RadiusComparison6px: Story = {
  name: 'Radius comparison — 6px',
  render: () => <ControlledPalette initialOpen onSelect={fn()} panelClassName="rounded-[6px]" />,
};

export const RadiusComparison10px: Story = {
  name: 'Radius comparison — 10px',
  render: () => <ControlledPalette initialOpen onSelect={fn()} panelClassName="rounded-[10px]" />,
};
