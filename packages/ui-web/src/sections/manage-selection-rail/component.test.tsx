import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ManageSelectionRail } from './component';
import { archivedProjectFixture, selectedProjectFixture } from './fixtures';

describe('ManageSelectionRail', () => {
  it('renders the targeted row’s name, account and money figures', () => {
    render(<ManageSelectionRail project={selectedProjectFixture} />);

    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
    expect(screen.getByText('Spend MTD')).toBeInTheDocument();
    expect(screen.getByText('Ceiling')).toBeInTheDocument();
  });

  it('renders em dashes rather than zeroes for an archived project', () => {
    render(<ManageSelectionRail project={archivedProjectFixture} />);

    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('falls back to an inline status line, not a placard, when nothing is selected', () => {
    render(<ManageSelectionRail project={null} />);

    expect(screen.getByText('No rows selected.')).toBeInTheDocument();
  });
});
