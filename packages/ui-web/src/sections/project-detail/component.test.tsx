import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProjectDetail } from './component';
import { selectedProjectFixture, suspendedProjectFixture } from './fixtures';

describe('ProjectDetail', () => {
  it('renders the targeted project’s figure labels', () => {
    render(<ProjectDetail project={selectedProjectFixture} />);

    expect(screen.getByText('Spend MTD')).toBeInTheDocument();
    expect(screen.getByText('Quota tier')).toBeInTheDocument();
  });

  it('renders the quota tier id as text, never as a coerced currency figure', () => {
    render(<ProjectDetail project={selectedProjectFixture} />);

    expect(screen.getByText('scale')).toBeInTheDocument();
  });

  it('renders em dashes rather than zeroes for a suspended project with no quota tier', () => {
    render(<ProjectDetail project={suspendedProjectFixture} />);

    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
