import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NavSpine } from './component';
import type { NavGroup } from './types';

const workspaceGroup: NavGroup = {
  key: 'workspace',
  label: 'Workspace',
  items: [
    { key: 'overview', label: 'Overview', active: true },
    { key: 'api-keys', label: 'Api-Keys' },
  ],
};
const operatorGroup: NavGroup = {
  key: 'operator',
  label: 'Operator',
  items: [{ key: 'admin', label: 'Admin' }],
};

describe('NavSpine', () => {
  it('renders every item across every group as a button by default', () => {
    render(<NavSpine groups={[workspaceGroup]} layout="sidebar" />);

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Api-Keys' })).toBeInTheDocument();
  });

  it('renders a group label row when a group has one', () => {
    render(<NavSpine groups={[workspaceGroup]} layout="sidebar" />);

    expect(screen.getByText('Workspace')).toBeInTheDocument();
  });

  it('renders no label row for a group with none', () => {
    const unlabelled: NavGroup = { key: 'account', items: [{ key: 'settings', label: 'Settings' }] };
    render(<NavSpine groups={[unlabelled]} layout="sidebar" />);

    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  // Active state is not a cva boolean axis (console-ui skill shrink policy) and is not a class
  // swapped in JS either: the `raised` fill is `theme.css`'s `rail-row[aria-current="page"]`.
  it('marks the active item with aria-current and data-active, and never with daisy menu-active', () => {
    render(<NavSpine groups={[workspaceGroup]} layout="sidebar" />);

    const active = screen.getByRole('button', { name: 'Overview' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveAttribute('data-active');
    expect(active).toHaveClass('rail-row');
    expect(active).not.toHaveClass('menu-active');

    const inactive = screen.getByRole('button', { name: 'Api-Keys' });
    expect(inactive).not.toHaveAttribute('aria-current');
    expect(inactive).not.toHaveAttribute('data-active');
  });

  // The invariant that decided the Base UI adoption. See the component's own doc comment for the
  // measured proof this guards.
  it('leaves every destination in the natural tab order — no roving tab stop', () => {
    const { container } = render(<NavSpine groups={[workspaceGroup, operatorGroup]} layout="sidebar" />);

    const rows = [...container.querySelectorAll('li > a, li > button')];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).not.toHaveAttribute('tabindex');
    }
  });

  it('renders the sidebar rows as a daisy menu list', () => {
    const { container } = render(<NavSpine groups={[workspaceGroup]} layout="sidebar" />);

    const list = container.querySelector('ul');
    expect(list).toHaveClass('menu', 'menu-sm', 'rail-list');
    expect(container.querySelectorAll('li')).toHaveLength(3); // 1 group label + 2 items
  });

  it('fires onSelect with the item key', () => {
    const onSelect = vi.fn();
    render(
      <NavSpine
        groups={[{ key: 'g', items: [{ key: 'overview', label: 'Overview', onSelect }] }]}
        layout="sidebar"
      />
    );

    screen.getByRole('button', { name: 'Overview' }).click();

    expect(onSelect).toHaveBeenCalledWith('overview');
  });

  it('renders an anchor when href is provided', () => {
    render(
      <NavSpine
        groups={[{ key: 'g', items: [{ key: 'overview', label: 'Overview', href: '/overview' }] }]}
        layout="sidebar"
      />
    );

    const link = screen.getByRole('link', { name: 'Overview' });
    expect(link).toHaveAttribute('href', '/overview');
  });

  it('renders href items through a custom linkComponent (e.g. next/link) instead of a bare anchor', () => {
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
        groups={[
          { key: 'g', items: [{ key: 'overview', label: 'Overview', href: '/overview', active: true }] },
        ]}
        layout="sidebar"
        linkComponent={CustomLink}
      />
    );

    expect(CustomLink).toHaveBeenCalled();
    const link = screen.getByTestId('custom-link');
    expect(link).toHaveAttribute('href', '/overview');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  // There is no more `adminItems`/`showAdmin` axis (shell brief 2026-08-30) — a gated group is
  // simply included or omitted from `groups` by the caller, and the group's own optional label
  // IS the role marker.
  it('has no special-cased admin group — an omitted group renders nothing of it at all', () => {
    render(<NavSpine groups={[workspaceGroup]} layout="sidebar" />);

    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByText('Operator')).not.toBeInTheDocument();
  });

  it('renders an included group with its own label, and no separate role marker element', () => {
    render(<NavSpine groups={[workspaceGroup, operatorGroup]} layout="sidebar" />);

    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.queryByText('Role')).not.toBeInTheDocument();
    expect(screen.queryByText('ROLE')).not.toBeInTheDocument();
  });

  describe('bottom-bar layout', () => {
    it('flattens every group into one horizontal strip, without any group label', () => {
      render(<NavSpine groups={[workspaceGroup, operatorGroup]} layout="bottom-bar" />);

      expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Api-Keys' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
      expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
      expect(screen.queryByText('Operator')).not.toBeInTheDocument();
    });

    it('marks the active item with aria-current and the primary text colour', () => {
      render(<NavSpine groups={[workspaceGroup]} layout="bottom-bar" />);

      const active = screen.getByRole('button', { name: 'Overview' });
      expect(active).toHaveAttribute('aria-current', 'page');
      expect(active).toHaveAttribute('data-active');
      expect(active).toHaveClass('nav-dock-row');
    });
  });
});
