import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthPanelShell } from './component';

describe('AuthPanelShell', () => {
  it('renders the default wordmark and the page title as a heading', () => {
    render(<AuthPanelShell title="Enter the code shown on your device">content</AuthPanelShell>);

    expect(screen.getByText('LIGHTBRIDGE')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Enter the code shown on your device' })
    ).toBeInTheDocument();
  });

  it('accepts a custom wordmark', () => {
    render(
      <AuthPanelShell wordmark="adorsys-gis" title="Device paired">
        content
      </AuthPanelShell>
    );

    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
  });

  it('omits the lead paragraph when none is given', () => {
    const { container } = render(<AuthPanelShell title="Device paired">content</AuthPanelShell>);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('renders the lead under the title when given', () => {
    render(
      <AuthPanelShell
        title="Enter the code shown on your device"
        lead="Codes expire after a few minutes.">
        content
      </AuthPanelShell>
    );

    expect(screen.getByText('Codes expire after a few minutes.')).toBeInTheDocument();
  });

  it('renders its children inside the centred column', () => {
    render(
      <AuthPanelShell title="Enter the code shown on your device">
        <button type="button">Continue</button>
      </AuthPanelShell>
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});
