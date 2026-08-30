import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './component';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Api-Keys" />);
    expect(screen.getByRole('heading', { name: 'Api-Keys' })).toBeInTheDocument();
  });

  it('omits the subtitle when none is given', () => {
    render(<PageHeader title="Api-Keys" />);
    expect(screen.queryByText(/adorsys-gis/)).not.toBeInTheDocument();
  });

  it('renders the subtitle under the title', () => {
    render(<PageHeader title="Api-Keys" subtitle="adorsys-gis / gateway-prod" />);
    expect(screen.getByText('adorsys-gis / gateway-prod')).toBeInTheDocument();
  });

  it('renders no trailing controls cluster when neither controls nor action are given', () => {
    const { container } = render(<PageHeader title="Api-Keys" />);
    expect(container.querySelector('.page-header-controls')).not.toBeInTheDocument();
  });

  it('renders controls before action inside the trailing cluster', () => {
    render(
      <PageHeader
        title="Api-Keys"
        controls={<span>Scope: gateway-prod</span>}
        action={<button type="button">+ New key</button>}
      />
    );

    const cluster = screen.getByRole('button', { name: '+ New key' }).parentElement;
    expect(cluster).toHaveClass('page-header-controls');
    expect(screen.getByText('Scope: gateway-prod')).toBeInTheDocument();
  });
});
