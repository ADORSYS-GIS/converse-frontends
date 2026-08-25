import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SubNav } from './component';
import type { SubNavItem } from './types';

const items: SubNavItem[] = [
  { key: 'projects', label: 'Projects', count: 24, active: true },
  { key: 'accounts', label: 'Accounts', count: 3 },
];

describe('SubNav', () => {
  it('renders every item with its count as plain text', () => {
    render(<SubNav items={items} />);

    expect(screen.getByRole('button', { name: 'Projects 24' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accounts 3' })).toBeInTheDocument();
  });

  it('renders items without a count when count is omitted', () => {
    render(<SubNav items={[{ key: 'projects', label: 'Projects' }]} />);

    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument();
  });

  it('marks the active item', () => {
    render(<SubNav items={items} />);

    const active = screen.getByRole('button', { name: 'Projects 24' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).toContain('bg-raised');
  });

  it('never renders a badge/pill element for the count', () => {
    render(<SubNav items={items} />);

    // The count sits in the row's own text node, not a separately-styled pill wrapper.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fires onSelect with the item key', () => {
    const onSelect = vi.fn();
    render(<SubNav items={[{ key: 'projects', label: 'Projects', onSelect }]} />);

    screen.getByRole('button', { name: 'Projects' }).click();

    expect(onSelect).toHaveBeenCalledWith('projects');
  });

  it('renders an anchor when href is provided', () => {
    render(<SubNav items={[{ key: 'projects', label: 'Projects', href: '/manage/projects' }]} />);

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/manage/projects',
    );
  });

  it('renders href items through a custom linkComponent instead of a bare anchor', () => {
    // Same seam as `NavSpine.linkComponent` (see that component's regression test) — a router-aware
    // Link, e.g. `next/link`, receives exactly these props.
    const CustomLink = vi.fn(
      ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} data-testid="custom-link" {...rest}>
          {children}
        </a>
      ),
    );

    render(
      <SubNav
        items={[{ key: 'projects', label: 'Projects', href: '/manage/projects' }]}
        linkComponent={CustomLink}
      />,
    );

    expect(CustomLink).toHaveBeenCalled();
    expect(screen.getByTestId('custom-link')).toHaveAttribute('href', '/manage/projects');
  });
});
