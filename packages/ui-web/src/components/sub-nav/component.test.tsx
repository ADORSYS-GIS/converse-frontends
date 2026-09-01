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
    // The `raised` fill is `theme.css`'s `rail-row[aria-current="page"]` — the same rule
    // `NavSpine`'s rows resolve, which is the point of the shared class. daisy's `menu-active` is
    // deliberately NOT added alongside it: it was carried to exclude the active row from daisy's
    // row-hover rule, but an `@utility` is unlayered inside `utilities` while daisy emits into a
    // sublayer of it, so `rail-row` already outranks that rule by layer — which is a fact about
    // cascade layers and therefore the same in both themes. Measured on the identical `rail-row`
    // in `NavSpine` under `black`: with the class removed, the hovered active row still computes
    // `--color-raised`/`--color-ink` while a hovered inactive row computes `--color-neutral`. The
    // active row's own paint was then confirmed under `wireframe` too.
    expect(active).toHaveClass('rail-row');
    expect(active).not.toHaveClass('menu-active');
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

  describe('horizontal orientation', () => {
    const tabs: SubNavItem[] = [
      { key: 'account', label: 'Account', href: '/settings/account', active: true },
      { key: 'projects', label: 'Projects', href: '/settings/projects', count: 3 },
    ];

    it('renders every item as a real link, active state read off aria-current', () => {
      render(<SubNav items={tabs} orientation="horizontal" />);

      const active = screen.getByRole('link', { name: 'Account' });
      expect(active).toHaveAttribute('href', '/settings/account');
      expect(active).toHaveAttribute('aria-current', 'page');
      expect(active).toHaveClass('sub-nav-tab');

      const inactive = screen.getByRole('link', { name: 'Projects 3' });
      expect(inactive).toHaveAttribute('href', '/settings/projects');
      expect(inactive).not.toHaveAttribute('aria-current');
    });

    it('carries no icon column and no rail bleed — it is a tab row, not a rail', () => {
      render(<SubNav items={tabs} orientation="horizontal" />);

      expect(screen.getByRole('link', { name: 'Account' })).not.toHaveClass('rail-row');
    });
  });
});
