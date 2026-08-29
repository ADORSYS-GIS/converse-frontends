import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ManageSelectionRail } from './component';
import { selectedProjectFixture, suspendedProjectFixture } from './fixtures';

describe('ManageSelectionRail', () => {
  it('renders the targeted row’s name, account and figure labels', () => {
    render(<ManageSelectionRail project={selectedProjectFixture} />);

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
    expect(screen.getByText('Spend MTD')).toBeInTheDocument();
    expect(screen.getByText('Quota tier')).toBeInTheDocument();
  });

  it('renders the quota tier id as text, never as a coerced currency figure', () => {
    render(<ManageSelectionRail project={selectedProjectFixture} />);

    expect(screen.getByText('scale')).toBeInTheDocument();
  });

  it('renders em dashes rather than zeroes for a suspended project with no quota tier', () => {
    render(<ManageSelectionRail project={suspendedProjectFixture} />);

    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('falls back to an inline status line, not a placard, when nothing is selected', () => {
    render(<ManageSelectionRail project={null} />);

    expect(screen.getByText('No rows selected.')).toBeInTheDocument();
  });
});
