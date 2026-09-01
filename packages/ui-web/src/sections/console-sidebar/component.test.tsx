import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { NavGroup } from '../../components/nav-spine';
import { ConsoleSidebar } from './component';

const groups: NavGroup[] = [
  {
    key: 'workspace',
    label: 'Workspace',
    items: [
      { key: 'overview', label: 'Overview', active: true },
      { key: 'api-keys', label: 'Api-Keys' },
    ],
  },
];

describe('ConsoleSidebar', () => {
  it('renders the brand, switcher, nav and footer slots', () => {
    render(
      <ConsoleSidebar
        brand={<span>Lightbridge</span>}
        workspaceSwitcher={<span>adorsys-gis</span>}
        groups={groups}
        footer={<span>Footer content</span>}
      />
    );

    expect(screen.getByText('Lightbridge')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('renders the nav twice — once as the persistent sidebar, once as the bottom dock — from one groups prop', () => {
    render(
      <ConsoleSidebar
        brand={<span>Lightbridge</span>}
        workspaceSwitcher={<span>adorsys-gis</span>}
        groups={groups}
        footer={<span>Footer content</span>}
      />
    );

    expect(screen.getAllByRole('button', { name: 'Overview' })).toHaveLength(2);
  });

  it('carries the console-sidebar column geometry on the persistent aside only', () => {
    const { container } = render(
      <ConsoleSidebar
        brand={<span>Lightbridge</span>}
        workspaceSwitcher={<span>adorsys-gis</span>}
        groups={groups}
        footer={<span>Footer content</span>}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('md:w-[240px]');
  });
});
