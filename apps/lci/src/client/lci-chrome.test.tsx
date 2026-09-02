import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LciTopBarContent } from './lci-chrome';

/** jsdom ships no `matchMedia`; `useTheme` (via `ConsoleTopBar`) would throw without this. */
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

/**
 * The brand mark's runtime white-label branching — the same three states `apps/console`'s own
 * `BrandMark` covers (issue #368, Phase H): unconfigured (built-in SVG), one image configured,
 * and both dark/light images configured. Exercised via `LciTopBarContent` since it renders the
 * mark with no other props to stub.
 */
describe('LciBrandMark (via LciTopBarContent)', () => {
  it('renders the built-in SVG mark when no logo is configured', () => {
    render(<LciTopBarContent onOpenPalette={vi.fn()} hasLogo={false} hasLogoLight={false} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('svg path[d="M2 14 8 2 14 14Z"]')).toBeInTheDocument();
  });

  it('renders a single configured logo image when only the dark mark is set', () => {
    render(<LciTopBarContent onOpenPalette={vi.fn()} hasLogo={true} hasLogoLight={false} />);
    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('/branding/logo');
    expect(images[0].classList.contains('brand-mark-dark')).toBe(false);
  });

  it('renders both dark and light images when both are configured', () => {
    render(<LciTopBarContent onOpenPalette={vi.fn()} hasLogo={true} hasLogoLight={true} />);
    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute('src')).toBe('/branding/logo');
    expect(images[0].classList.contains('brand-mark-dark')).toBe(true);
    expect(images[1].getAttribute('src')).toBe('/branding/logo-light');
    expect(images[1].classList.contains('brand-mark-light')).toBe(true);
  });
});
