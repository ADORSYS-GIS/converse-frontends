import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConsoleHeader } from './component';

describe('ConsoleHeader', () => {
  it('renders the fallback wordmark when no logo is configured', () => {
    render(<ConsoleHeader />);

    expect(screen.getByText('LIGHTBRIDGE')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders a custom wordmark', () => {
    render(<ConsoleHeader wordmark="ACME" />);

    expect(screen.getByText('ACME')).toBeInTheDocument();
  });

  it('renders the configured logo image instead of the wordmark glyph when logoSrc is set', () => {
    render(<ConsoleHeader logoSrc="https://example.com/logo.png" logoAlt="Acme Corp" />);

    const img = screen.getByRole('img', { name: 'Acme Corp' });
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('renders the org switcher slot with a divider when provided', () => {
    render(<ConsoleHeader orgSwitcher={<span>adorsys-gis</span>} />);

    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
  });

  it('omits the org switcher slot when not provided', () => {
    render(<ConsoleHeader />);

    expect(screen.queryByText('adorsys-gis')).not.toBeInTheDocument();
  });

  it('renders the identity slot on the right', () => {
    render(<ConsoleHeader identity={<span>sam@adorsys.com</span>} />);

    expect(screen.getByText('sam@adorsys.com')).toBeInTheDocument();
  });

  it('renders the palette trigger slot before identity', () => {
    render(
      <ConsoleHeader
        paletteTrigger={<button type="button">Open command palette</button>}
        identity={<span>sam@adorsys.com</span>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Open command palette' })).toBeInTheDocument();
  });

  it('omits the palette trigger slot when not provided', () => {
    render(<ConsoleHeader />);

    expect(screen.queryByRole('button', { name: 'Open command palette' })).not.toBeInTheDocument();
  });

  it('applies the chrome surface treatment', () => {
    render(<ConsoleHeader />);

    expect(screen.getByText('LIGHTBRIDGE').closest('header')).toHaveClass('bg-chrome');
  });
});
