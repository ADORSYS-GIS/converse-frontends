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
 * Also issue #368's own Phase H (runtime white-label branding): `BrandMark({ hasCustomLogo })`
 * swaps the built-in mark for the operator's runtime logo (`GET /branding/logo`) without touching
 * the link/accessible-name contract above — see the `hasCustomLogo` describe block below.
 *
 * `console-chrome.test.ts` (the rest of this module's tests) stays `.test.ts` / pure-function —
 * this is `.test.tsx` / `jsdom` specifically because `BrandMark` is JSX and needs a real render to
 * check (same split `vitest.config.ts` documents for `url-state-cross-zone.test.tsx`).
 */
describe('BrandMark (hasCustomLogo=false, the built-in mark)', () => {
  it('is a link to / (the last-account resolver), not inert chrome', () => {
    render(<BrandMark hasCustomLogo={false} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('carries the accessible name on the link, and renders no visible "Lightbridge" wordmark', () => {
    render(<BrandMark hasCustomLogo={false} />);

    const link = screen.getByRole('link', { name: /lightbridge/i });
    expect(link).toBeInTheDocument();
    // The old wordmark was a plain text node a reader could see; now the only "Lightbridge" in
    // the DOM is the link's own (non-rendered) accessible name.
    expect(screen.queryByText('Lightbridge')).not.toBeInTheDocument();
  });

  it('keeps the logo mark decorative (aria-hidden) since the link already carries the name', () => {
    const { container } = render(<BrandMark hasCustomLogo={false} />);

    const logo = container.querySelector('.header-logo');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the fallback SVG mark, not an <img>', () => {
    const { container } = render(<BrandMark hasCustomLogo={false} />);

    expect(container.querySelector('.header-logo svg')).toBeInTheDocument();
    expect(container.querySelector('.header-logo img')).not.toBeInTheDocument();
  });
});

describe('BrandMark (hasCustomLogo=true, issue #368 Phase H)', () => {
  it('is still a link to / with the same accessible name', () => {
    render(<BrandMark hasCustomLogo />);

    const link = screen.getByRole('link', { name: /lightbridge/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders the runtime logo route as an <img>, not the fallback SVG', () => {
    const { container } = render(<BrandMark hasCustomLogo />);

    const img = container.querySelector('.header-logo');
    expect(img?.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', '/branding/logo');
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('keeps the image decorative — the link already carries the accessible name', () => {
    const { container } = render(<BrandMark hasCustomLogo />);

    const img = container.querySelector('.header-logo');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('alt', '');
  });
});
