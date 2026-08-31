import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { SelectField } from './component';

const meta: Meta<typeof SelectField> = {
  // `Forms & actions/*`, matching every other control in this group (`Field`, `SegmentedControl`,
  // `ScopeSelect`, the four dialogs) — this component's own title used to be the lone `Forms/*`
  // outlier in the sidebar, one more small inconsistency the unify-select pass (issue #368) closes.
  title: 'Forms & actions/SelectField',
  component: SelectField,
};

export default meta;
type Story = StoryObj<typeof SelectField>;

function Demo() {
  const [value, setValue] = useState('last-30');
  return (
    <div className="bg-surface w-[248px] p-4">
      <SelectField
        label="Range"
        value={value}
        options={[
          { value: 'last-7', label: 'Last 7 days' },
          { value: 'last-30', label: 'Last 30 days' },
          { value: 'last-90', label: 'Last 90 days' },
        ]}
        onChange={setValue}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

/**
 * Popup open — the "select" half of the overlay-restyle design review (owner ask, 2026-08-31):
 * same row rhythm and floating-overlay radius `CommandPalette` and every other Menu/Select/
 * Combobox/Popover popup now share (`select-field-item`, `OVERLAY_*`, theme.css).
 */
export const Open: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A plain role query, not `{ name: 'Range' }`: the built Storybook's browser-side
    // accessible-name computation does not resolve this trigger's `aria-labelledby` the way
    // jsdom's does in `component.test.tsx` (`getByLabelText('Range')` passes there) -- a
    // pre-existing platform gap between the two a11y-tree implementations, not a component
    // defect. There is exactly one combobox in this story either way.
    await userEvent.click(canvas.getByRole('combobox'));
  },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Open`.
export const OpenLight: Story = {
  name: 'Open — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A plain role query, not `{ name: 'Range' }`: the built Storybook's browser-side
    // accessible-name computation does not resolve this trigger's `aria-labelledby` the way
    // jsdom's does in `component.test.tsx` (`getByLabelText('Range')` passes there) -- a
    // pre-existing platform gap between the two a11y-tree implementations, not a component
    // defect. There is exactly one combobox in this story either way.
    await userEvent.click(canvas.getByRole('combobox'));
  },
};

/**
 * The already-selected row ("Last 30 days") stays visually marked even after the keyboard
 * highlight moves to a DIFFERENT row — regression coverage for the unify-select audit's own
 * finding (issue #368): `OVERLAY_ITEM_CLASS` used to gate the selected-row treatment on
 * `data-[selected=true]`, a selector requiring the literal string `"true"` that Base UI's
 * Select.Item never sets (confirmed against the rendered DOM: it renders bare `data-selected=""`,
 * exactly like its sibling `data-highlighted`), so a selected row that was not ALSO the
 * keyboard-highlighted one rendered with no distinguishing treatment at all. Fixed to
 * `data-[selected]` (presence, same idiom as `data-highlighted`), plus a 2px `primary` accent bar
 * (`select-field-item`, theme.css) matching the command palette's own selected-row language —
 * raised fill everywhere `data-highlighted`/`data-selected` are true, the accent bar ADDED for the
 * true selection specifically.
 */
export const Selected: Story = {
  name: 'Selected row — distinct from keyboard highlight',
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('combobox'));
    // Moves the keyboard highlight OFF "Last 30 days" (the selected row, open on Base UI's own
    // default highlighted index) onto "Last 90 days" instead, so the popup shows both states at
    // once on two different rows.
    await userEvent.keyboard('{ArrowDown}');
  },
};

/** The whole control disabled — the case that used to drive `CreateApiKeyDialog`/
 *  `CreateProjectDialog` to hand-roll their own `Select.Root` instead of this component: a
 *  billing-plan catalogue still loading, with a placeholder item standing in for a real one. */
export const Disabled: Story = {
  render: () => (
    <div className="bg-surface w-[248px] p-4">
      <SelectField
        label="Billing plan"
        value=""
        options={[{ value: '', label: 'Loading plans…' }]}
        onChange={() => {}}
        disabled
      />
    </div>
  ),
};

/** `error` — the identical contract `Field`'s own `error` prop carries: border to `primary`, a
 *  `meta` line underneath. */
export const ErrorInField: Story = {
  name: 'Error',
  render: () => (
    <div className="bg-surface w-[248px] p-4">
      <SelectField
        label="Billing plan"
        value=""
        options={[
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
        ]}
        onChange={() => {}}
        error="Choose a plan before continuing."
      />
    </div>
  ),
};

// `wireframe` (light) counterpart of `ErrorInField`.
export const ErrorInFieldLight: Story = {
  name: 'Error — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => (
    <div className="bg-surface w-[248px] p-4">
      <SelectField
        label="Billing plan"
        value=""
        options={[
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
        ]}
        onChange={() => {}}
        error="Choose a plan before continuing."
      />
    </div>
  ),
};

/** Base tier (<600, `CONSOLE_VIEWPORTS.base390`) — the trigger stays full-width in a narrow
 *  column exactly as it does in a toolbar; the popup's own `min-w-(--anchor-width)` keeps it at
 *  least as wide as that trigger. */
export const Mobile: Story = {
  name: 'Open — base tier (390px)',
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('combobox'));
  },
};
