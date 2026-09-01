import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const usePathnameMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

const { RepoTabsNav } = await import('./repo-tabs-nav');

describe('RepoTabsNav', () => {
  it('renders Overview, Graph, and Settings, each linking to its own tab', () => {
    usePathnameMock.mockReturnValue('/repositories/81');
    render(<RepoTabsNav id={81} />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/repositories/81'
    );
    expect(screen.getByRole('link', { name: 'Graph' })).toHaveAttribute(
      'href',
      '/repositories/81/graph'
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/repositories/81/settings'
    );
  });

  it('marks Overview active on an exact match to the base path, not on a nested route', () => {
    usePathnameMock.mockReturnValue('/repositories/81');
    render(<RepoTabsNav id={81} />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Graph' })).not.toHaveAttribute('aria-current');
  });

  it('marks Graph active on the graph path, and Overview inactive there', () => {
    usePathnameMock.mockReturnValue('/repositories/81/graph');
    render(<RepoTabsNav id={81} />);

    expect(screen.getByRole('link', { name: 'Graph' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('marks Settings active on the settings path', () => {
    usePathnameMock.mockReturnValue('/repositories/81/settings');
    render(<RepoTabsNav id={81} />);

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });
});
