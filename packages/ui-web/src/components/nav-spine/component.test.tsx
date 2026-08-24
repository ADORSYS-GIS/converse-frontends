import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NavSpine } from './component';
import type { NavSpineItem } from './types';

const items: NavSpineItem[] = [
  { key: 'overview', label: 'Overview', active: true },
  { key: 'api-keys', label: 'Api-Keys' },
];
const adminItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin' }];

describe('NavSpine', () => {
  it('renders every item as a button by default', () => {
    render(<NavSpine items={items} />);

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Api-Keys' })).toBeInTheDocument();
  });

  it('marks the active item with aria-current and the raised fill', () => {
    render(<NavSpine items={items} />);

    const active = screen.getByRole('button', { name: 'Overview' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveClass('bg-raised');

    const inactive = screen.getByRole('button', { name: 'Api-Keys' });
    expect(inactive).not.toHaveAttribute('aria-current');
    expect(inactive).not.toHaveClass('bg-raised');
  });

  it('fires onSelect with the item key', () => {
    const onSelect = vi.fn();
    render(
      <NavSpine
        items={[{ key: 'overview', label: 'Overview', onSelect }]}
      />,
    );

    screen.getByRole('button', { name: 'Overview' }).click();

    expect(onSelect).toHaveBeenCalledWith('overview');
  });

  it('renders an anchor when href is provided', () => {
    render(<NavSpine items={[{ key: 'overview', label: 'Overview', href: '/overview' }]} />);

    const link = screen.getByRole('link', { name: 'Overview' });
    expect(link).toHaveAttribute('href', '/overview');
  });

  it('hides the Admin group when showAdmin is false', () => {
    render(<NavSpine items={items} adminItems={adminItems} showAdmin={false} />);

    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByText('ROLE')).not.toBeInTheDocument();
  });

  it('renders the Admin group with a role marker when showAdmin is true', () => {
    render(<NavSpine items={items} adminItems={adminItems} showAdmin />);

    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByText('ROLE')).toBeInTheDocument();
  });

  it('supports a custom role marker label', () => {
    render(
      <NavSpine items={items} adminItems={adminItems} showAdmin roleLabel="STAFF" />,
    );

    expect(screen.getByText('STAFF')).toBeInTheDocument();
  });
});
