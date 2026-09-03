import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Pagination } from './component';

const meta: Meta<typeof Pagination> = {
  title: 'Primitives/Data/Pagination',
  component: Pagination,
  args: {
    shown: 12,
    total: 23,
    unit: 'keys',
    hasPrev: false,
    hasNext: true,
    onPrev: fn(),
    onNext: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const FirstPage: Story = {};

export const MiddlePage: Story = {
  args: { shown: 12, total: 23, hasPrev: true, hasNext: true },
};

export const LastPage: Story = {
  args: { shown: 11, total: 23, hasPrev: true, hasNext: false },
};

export const UnknownTotal: Story = {
  name: 'Total unknown — "12 keys" rather than "of ?"',
  args: { shown: 12, total: undefined, hasPrev: true, hasNext: true },
};

/** No caller wiring for either direction — a single page of results renders no bar at all. */
export const Unwired: Story = {
  name: 'Nothing wired — renders null',
  args: { onPrev: undefined, onNext: undefined },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart.
export const FirstPageLight: Story = {
  name: 'First page — wireframe (light)',
  args: FirstPage.args,
  globals: { theme: 'wireframe' },
};
