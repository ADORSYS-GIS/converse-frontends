import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BRAND } from './console-chrome';

/**
 * Owner review findings, 2026-08-31 (issue #368):
 *
 *   2. "When I click on the main logo, I should be redirected to the '/'. Current behaviour: not
 *      clickable." — `BRAND` used to render two inert `<span>`s; it is now `next/link`'s `Link`
 *      pointed at `/`, the last-account resolver (ADR 0013 D1), which is exactly "take me home".
 *   3. "If there's a logo, the name 'Lightbridge' should scram." — the `header-wordmark` span
 *      (visible "Lightbridge" text) is gone; the accessible name it used to carry now lives on
 *      the link's own `aria-label` instead, so the mark stays nameable with nothing doubled up.
 *
 * `console-chrome.test.ts` (the rest of this module's tests) stays `.test.ts` / pure-function —
 * this is `.test.tsx` / `jsdom` specifically because `BRAND` is JSX and needs a real render to
 * check (same split `vitest.config.ts` documents for `url-state-cross-zone.test.tsx`).
 */
describe('BRAND', () => {
  it('is a link to / (the last-account resolver), not inert chrome', () => {
    render(BRAND);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('carries the accessible name on the link, and renders no visible "Lightbridge" wordmark', () => {
    render(BRAND);

    const link = screen.getByRole('link', { name: /lightbridge/i });
    expect(link).toBeInTheDocument();
    // The old wordmark was a plain text node a reader could see; now the only "Lightbridge" in
    // the DOM is the link's own (non-rendered) accessible name.
    expect(screen.queryByText('Lightbridge')).not.toBeInTheDocument();
  });

  it('keeps the logo mark decorative (aria-hidden) since the link already carries the name', () => {
    const { container } = render(BRAND);

    const logo = container.querySelector('.header-logo');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
  });
});
