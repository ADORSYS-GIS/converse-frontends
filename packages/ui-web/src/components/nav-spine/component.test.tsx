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

  // Active state is a `data-*` variant now, not a cva boolean axis (console-ui skill shrink
  // policy): the row carries `data-active` and daisy's `menu-active`, and the `raised` fill is
  // selected by `data-[active=true]:bg-raised` rather than by a class swapped in JS.
  it('marks the active item with aria-current, data-active and daisy menu-active', () => {
    render(<NavSpine items={items} />);

    const active = screen.getByRole('button', { name: 'Overview' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveAttribute('data-active', 'true');
    expect(active).toHaveClass('menu-active');
    expect(active).toHaveClass('data-[active=true]:bg-raised');

    const inactive = screen.getByRole('button', { name: 'Api-Keys' });
    expect(inactive).not.toHaveAttribute('aria-current');
    expect(inactive).toHaveAttribute('data-active', 'false');
    expect(inactive).not.toHaveClass('menu-active');
  });

  it('renders the rail rows as a daisy menu list, like its SubNav sibling', () => {
    const { container } = render(<NavSpine items={items} />);

    const list = container.querySelector('ul');
    expect(list).toHaveClass('menu', 'menu-sm');
    // daisy `menu`'s own gutters must stay neutralised — the rail alignment grid owns every
    // inset (lib/rail-grid.ts), which is exactly what `SubNav` regressed on before it existed.
    expect(list).toHaveClass('p-0', '-mx-2');
    expect(container.querySelectorAll('li')).toHaveLength(items.length);
  });

  it('fires onSelect with the item key', () => {
    const onSelect = vi.fn();
    render(<NavSpine items={[{ key: 'overview', label: 'Overview', onSelect }]} />);

    screen.getByRole('button', { name: 'Overview' }).click();

    expect(onSelect).toHaveBeenCalledWith('overview');
  });

  it('renders an anchor when href is provided', () => {
    render(<NavSpine items={[{ key: 'overview', label: 'Overview', href: '/overview' }]} />);

    const link = screen.getByRole('link', { name: 'Overview' });
    expect(link).toHaveAttribute('href', '/overview');
  });

  it('renders href items through a custom linkComponent (e.g. next/link) instead of a bare anchor', () => {
    // Regression: `apps/console` previously had no way to route `NavSpine`'s href items through
    // `next/link`, so every nav click was a full document reload (not a client-side transition) —
    // the console's actual "black screen between navigations" root cause. This proves the seam
    // that fixes it: a consumer-supplied component receives exactly the props a router-aware Link
    // needs.
    const CustomLink = vi.fn(
      ({
        href,
        children,
        ...rest
      }: {
        href: string;
        children: React.ReactNode;
        'aria-current'?: 'page';
      }) => (
        <a href={href} data-testid="custom-link" {...rest}>
          {children}
        </a>
      )
    );

    render(
      <NavSpine
        items={[{ key: 'overview', label: 'Overview', href: '/overview', active: true }]}
        linkComponent={CustomLink}
      />
    );

    expect(CustomLink).toHaveBeenCalled();
    const link = screen.getByTestId('custom-link');
    expect(link).toHaveAttribute('href', '/overview');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('hides the Admin group when showAdmin is false', () => {
    render(<NavSpine items={items} adminItems={adminItems} showAdmin={false} />);

    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByText('Role')).not.toBeInTheDocument();
  });

  it('renders the Admin group with a role marker when showAdmin is true', () => {
    render(<NavSpine items={items} adminItems={adminItems} showAdmin />);

    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('supports a custom role marker label', () => {
    render(<NavSpine items={items} adminItems={adminItems} showAdmin roleLabel="STAFF" />);

    expect(screen.getByText('STAFF')).toBeInTheDocument();
  });

  describe('bottom-bar layout', () => {
    it('renders every item as a horizontal strip, without a ROLE marker', () => {
      render(<NavSpine items={items} adminItems={adminItems} showAdmin layout="bottom-bar" />);

      expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Api-Keys' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
      expect(screen.queryByText('Role')).not.toBeInTheDocument();
    });

    it('hides the Admin item when showAdmin is false', () => {
      render(
        <NavSpine items={items} adminItems={adminItems} showAdmin={false} layout="bottom-bar" />
      );

      expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    });

    it('marks the active item with aria-current and the primary text colour', () => {
      render(<NavSpine items={items} layout="bottom-bar" />);

      const active = screen.getByRole('button', { name: 'Overview' });
      expect(active).toHaveAttribute('aria-current', 'page');
      expect(active).toHaveAttribute('data-active', 'true');
      expect(active).toHaveClass('data-[active=true]:text-primary');
    });
  });
});
