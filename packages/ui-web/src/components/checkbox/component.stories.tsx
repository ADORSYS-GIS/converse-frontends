import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox, CheckboxGroup } from './component';
import { LABEL_CLASS } from '../../lib/type-roles';

const meta: Meta<typeof Checkbox> = {
  title: 'Primitives/Actions/Checkbox',
  component: Checkbox,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

/** Every state of the box side by side — the acceptance surface for the daisy paint. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Checkbox label="Unchecked" checked={false} onCheckedChange={() => {}} />
      <Checkbox label="Checked" checked onCheckedChange={() => {}} />
      <Checkbox label="Indeterminate" indeterminate onCheckedChange={() => {}} />
      <Checkbox label="Disabled" checked={false} disabled onCheckedChange={() => {}} />
      <Checkbox label="Disabled, checked" checked disabled onCheckedChange={() => {}} />
    </div>
  ),
};

export const StatesLight: Story = {
  name: 'States — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: States.render,
};

export const Interactive: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(false);
    return (
      <Checkbox label="Include zero-usage keys" checked={checked} onCheckedChange={setChecked} />
    );
  },
};

/** A bare box, the way a ledger row's select cell uses it: no label, an `aria-label` instead. */
export const Unlabelled: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(true);
    return <Checkbox aria-label="Select row" checked={checked} onCheckedChange={setChecked} />;
  },
};

const STATUSES = ['active', 'revoked', 'expiring', 'unused'];

/**
 * A multi-value filter's shape: one `string[]`, plus a parent box whose mixed state is derived by
 * Base UI from `allValues` rather than computed at the call site.
 */
export const Group: Story = {
  render: function Render() {
    const [value, setValue] = useState<string[]>(['active', 'expiring']);
    return (
      <div className="bg-surface flex w-[208px] flex-col gap-3 p-4">
        <span className={LABEL_CLASS}>Status</span>
        <CheckboxGroup
          aria-label="Status"
          value={value}
          onValueChange={setValue}
          allValues={STATUSES}>
          <Checkbox parent label="All statuses" />
          <div className="border-raised flex flex-col gap-2 border-l pl-3">
            {STATUSES.map((status) => (
              <Checkbox key={status} name={status} label={status} />
            ))}
          </div>
        </CheckboxGroup>
      </div>
    );
  },
};

export const GroupLight: Story = {
  name: 'Group — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: Group.render,
};
