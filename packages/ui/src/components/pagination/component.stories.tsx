import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from '../text';
import { Pagination } from './component';
import type { PaginationProps } from './types';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  args: {
    page: 1,
    canPrev: false,
    hasMore: true,
    pageLabel: 'Page',
    previousLabel: 'Previous',
    nextLabel: 'Next',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 460 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const FirstPage: Story = {};

export const MiddlePage: Story = {
  args: { page: 3, canPrev: true, hasMore: true },
};

export const LastPage: Story = {
  args: { page: 5, canPrev: true, hasMore: false },
};

export const WithIcons: Story = {
  args: {
    page: 2,
    canPrev: true,
    hasMore: true,
    prevIcon: <Text intent="bodyStrong">‹</Text>,
    nextIcon: <Text intent="bodyStrong">›</Text>,
  },
};

// A named function component, not an inline arrow assigned to `render`, so `useState` below is
// recognized as a Hook call inside a component (`react-hooks/rules-of-hooks` requires the
// enclosing function name to start with an uppercase letter or `use`; a `render:` story property
// doesn't qualify even though Storybook treats it as one).
function InteractivePagination(args: PaginationProps) {
  const [page, setPage] = useState(1);
  const totalPages = 4;
  return (
    <Pagination
      {...args}
      page={page}
      canPrev={page > 1}
      hasMore={page < totalPages}
      onPrev={() => setPage((p) => Math.max(1, p - 1))}
      onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
    />
  );
}

/** Live state so Prev/Next actually move between pages. */
export const Interactive: Story = {
  render: (args) => <InteractivePagination {...args} />,
};
