import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Pagination } from './component';

const meta: Meta<typeof Pagination> = {
  title: 'Forms & actions/Pagination',
  component: Pagination,
};

export default meta;
type Story = StoryObj<typeof Pagination>;

function Controlled({ pageCount = 11 }: { pageCount?: number }) {
  const [current, setCurrent] = useState(0);
  return (
    <Pagination
      current={current}
      pageCount={pageCount}
      rangeLabel={`${current * 4 + 1}–${Math.min((current + 1) * 4, pageCount * 4)} / ${pageCount * 4}`}
      onPageChange={(page) => setCurrent(page ?? 0)}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};

export const AtStart: Story = {
  render: () => (
    <Pagination current={0} pageCount={11} rangeLabel="1–4 / 41" onPageChange={() => {}} />
  ),
};

export const AtEnd: Story = {
  render: () => (
    <Pagination current={10} pageCount={11} rangeLabel="41–41 / 41" onPageChange={() => {}} />
  ),
};

export const SinglePage: Story = {
  render: () => (
    <Pagination current={0} pageCount={1} rangeLabel="1–2 / 2" onPageChange={() => {}} />
  ),
};

export const DefaultLight: Story = {
  name: 'Default — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <Controlled />,
};
