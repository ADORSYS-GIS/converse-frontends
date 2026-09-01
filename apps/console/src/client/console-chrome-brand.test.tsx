import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandMark } from './console-chrome';

/**
 * Owner review findings, 2026-08-31 (issue #368):
 *
 *   2. "When I click on the main logo, I should be redirected to the '/'. Current behaviour: not
 *      clickable." — `BrandMark` used to render two inert `<span>`s; it is now `next/link`'s `Link`
 *      pointed at `/`, the last-account resolver (ADR 0013 D1), which is exactly "take me home".
 *   3. "If there's a logo, the name 'Lightbridge' should scram." — the `header-wordmark` span
 *      (visible "Lightbridge" text) is gone; the accessible name it used to carry now lives on
 *      the link's own `aria-label` instead, so the mark stays nameable with nothing doubled up.
 *
 * Also issue #368's own Phase H (runtime white-label branding): `BrandMark({ hasLogo })` swaps
 * the built-in mark for the operator's runtime logo (`GET /branding/logo`) without touching the
 * link/accessible-name contract above — see the `hasLogo` describe block below. The per-theme
 * logos addendum (owner directive 2026-08-31, "White is for dark themes") adds `hasLogoLight`,
 * covered by its own describe block further down.
 *
 * `console-chrome.test.ts` (the rest of this module's tests) stays `.test.ts` / pure-function —
 * this is `.test.tsx` / `jsdom` specifically because `BrandMark` is JSX and needs a real render to
 * check (same split `vitest.config.ts` documents for `url-state-cross-zone.test.tsx`).
 */
describe('BrandMark (hasLogo=false, the built-in mark)', () => {
  it('is a link to / (the last-account resolver), not inert chrome', () => {
    render(<BrandMark hasLogo={false} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('carries the accessible name on the link, and renders no visible "Lightbridge" wordmark', () => {
    render(<BrandMark hasLogo={false} />);

    const link = screen.getByRole('link', { name: /lightbridge/i });
    expect(link).toBeInTheDocument();
    // The old wordmark was a plain text node a reader could see; now the only "Lightbridge" in
    // the DOM is the link's own (non-rendered) accessible name.
    expect(screen.queryByText('Lightbridge')).not.toBeInTheDocument();
  });

  it('keeps the logo mark decorative (aria-hidden) since the link already carries the name', () => {
    const { container } = render(<BrandMark hasLogo={false} />);

    const logo = container.querySelector('.header-logo');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the fallback SVG mark, not an <img>', () => {
    const { container } = render(<BrandMark hasLogo={false} />);

    expect(container.querySelector('.header-logo svg')).toBeInTheDocument();
    expect(container.querySelector('.header-logo img')).not.toBeInTheDocument();
  });

  it('ignores hasLogoLight when hasLogo is false, and still renders the fallback mark', () => {
    const { container } = render(<BrandMark hasLogo={false} hasLogoLight />);

    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelector('.header-logo svg')).toBeInTheDocument();
  });
});

describe('BrandMark (hasLogo=true, hasLogoLight unset — issue #368 Phase H, single-logo behaviour)', () => {
  it('is still a link to / with the same accessible name', () => {
    render(<BrandMark hasLogo />);

    const link = screen.getByRole('link', { name: /lightbridge/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders the runtime logo route as a single <img>, not the fallback SVG', () => {
    const { container } = render(<BrandMark hasLogo />);

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', '/branding/logo');
    expect(images[0]).toHaveClass('header-logo');
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('keeps the image decorative — the link already carries the accessible name', () => {
    const { container } = render(<BrandMark hasLogo />);

    const img = container.querySelector('.header-logo');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('alt', '');
  });

  it('renders no logo-light request when hasLogoLight is false', () => {
    const { container } = render(<BrandMark hasLogo hasLogoLight={false} />);

    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img[src="/branding/logo-light"]')).not.toBeInTheDocument();
  });
});

/**
 * Per-theme logos addendum (owner directive 2026-08-31, "White is for dark themes"): with BOTH
 * `branding.logo` and `branding.logoLight` configured, `BrandMark` renders BOTH `<img>`s and lets
 * `theme.css`'s `brand-mark-dark`/`brand-mark-light` utilities pick which is visible, keyed off
 * `[data-theme]` on `<html>` — no JS theme read in this component (see its own doc comment for
 * why). This suite only asserts what React puts in the DOM (both images present, right classes,
 * right src, both still decorative); the actual show/hide-by-theme behaviour is CSS, verified by
 * inspection in Storybook (`packages/ui-web`'s `Shell/ConsoleShell` "branded, both themes" story),
 * not by a jsdom test (jsdom does not apply an author stylesheet's `display` rules).
 */
describe('BrandMark (hasLogo=true, hasLogoLight=true — per-theme logos)', () => {
  it('is still a link to / with the same accessible name', () => {
    render(<BrandMark hasLogo hasLogoLight />);

    const link = screen.getByRole('link', { name: /lightbridge/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders both the dark-theme and light-theme logo as separate <img>s', () => {
    const { container } = render(<BrandMark hasLogo hasLogoLight />);

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);

    const dark = container.querySelector('img[src="/branding/logo"]');
    const light = container.querySelector('img[src="/branding/logo-light"]');
    expect(dark).toBeInTheDocument();
    expect(light).toBeInTheDocument();
  });

  it('tags each image with header-logo plus its own theme-visibility utility class', () => {
    const { container } = render(<BrandMark hasLogo hasLogoLight />);

    const dark = container.querySelector('img[src="/branding/logo"]');
    const light = container.querySelector('img[src="/branding/logo-light"]');
    expect(dark).toHaveClass('header-logo', 'brand-mark-dark');
    expect(light).toHaveClass('header-logo', 'brand-mark-light');
  });

  it('keeps both images decorative — the link already carries the accessible name', () => {
    const { container } = render(<BrandMark hasLogo hasLogoLight />);

    for (const img of container.querySelectorAll('img')) {
      expect(img).toHaveAttribute('aria-hidden', 'true');
      expect(img).toHaveAttribute('alt', '');
    }
  });
});
