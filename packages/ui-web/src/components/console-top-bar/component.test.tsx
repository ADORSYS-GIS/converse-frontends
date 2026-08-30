import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConsoleTopBar } from './component';

describe('ConsoleTopBar', () => {
  it('renders the brand, switcher and identity slots', () => {
    render(
      <ConsoleTopBar
        brand={<span>Lightbridge</span>}
        workspaceSwitcher={<span>adorsys-gis</span>}
        identity={<span>SL</span>}
      />
    );

    expect(screen.getByText('Lightbridge')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
    expect(screen.getByText('SL')).toBeInTheDocument();
  });

  it('renders the palette trigger slot when provided', () => {
    render(
      <ConsoleTopBar
        brand={<span>Lightbridge</span>}
        workspaceSwitcher={<span>adorsys-gis</span>}
        paletteTrigger={<button type="button">Open command palette</button>}
        identity={<span>SL</span>}
      />
    );

    expect(screen.getByRole('button', { name: 'Open command palette' })).toBeInTheDocument();
  });

  it('omits the palette trigger slot when not provided', () => {
    render(
      <ConsoleTopBar
        brand={<span>Lightbridge</span>}
        workspaceSwitcher={<span>adorsys-gis</span>}
        identity={<span>SL</span>}
      />
    );

    expect(screen.queryByRole('button', { name: 'Open command palette' })).not.toBeInTheDocument();
  });

  it('applies the top-bar chrome band and stays hidden at md and up', () => {
    render(
      <ConsoleTopBar
        brand={<span>Lightbridge</span>}
        workspaceSwitcher={<span>adorsys-gis</span>}
        identity={<span>SL</span>}
      />
    );

    const bar = screen.getByText('Lightbridge').closest('header');
    expect(bar).toHaveClass('md:hidden');
  });
});
