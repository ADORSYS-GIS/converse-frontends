import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScreenHeading } from './component';

describe('ScreenHeading', () => {
  it('renders the title as the page heading plus its subline', () => {
    render(<ScreenHeading title="Overview" subline="adorsys-gis · last 30 days · UTC" />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis · last 30 days · UTC')).toBeInTheDocument();
  });

  it('renders both composition slots', () => {
    render(
      <ScreenHeading
        title="Api-Keys"
        subline="adorsys-gis / gateway-prod"
        sublineActions={<button type="button">Open scope</button>}
        actions={<button type="button">+ New key</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Open scope' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New key' })).toBeInTheDocument();
  });

  it('omits the subline row entirely when neither a subline nor slot is given', () => {
    const { container } = render(<ScreenHeading title="Projects" />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
