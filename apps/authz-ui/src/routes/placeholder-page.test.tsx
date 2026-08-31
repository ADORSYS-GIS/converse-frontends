import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlaceholderPage } from './placeholder-page';

/**
 * Arrange / Act / Assert (AGENTS.md §6). This suite has two jobs beyond "it renders":
 *
 *  1. it proves the `@lightbridge/ui-web/src/*` subpath alias actually resolves under vitest --
 *     `NoticePanel` imports `cn` that way, so a broken alias fails here rather than at `vite
 *     build` time; and
 *  2. it pins the token classes criterion 3's built-CSS assertion greps for, so a later
 *     restyle cannot silently remove the thing that assertion tests without failing a test.
 */
describe('PlaceholderPage', () => {
  it('states plainly that sign-in is not implemented', () => {
    render(<PlaceholderPage />);

    expect(screen.getByText(/placeholder/i)).not.toBeNull();
    expect(screen.getByText(/Sign-in is not implemented yet/i)).not.toBeNull();
  });

  it('carries the ui-web token utilities the built-CSS assertion depends on', () => {
    const { container } = render(<PlaceholderPage />);

    const main = container.querySelector('main');
    expect(main?.className).toContain('min-h-dvh');
    expect(main?.className).toContain('place-items-center');

    const panel = container.querySelector('main > div > div');
    expect(panel?.className).toContain('bg-surface');
  });

  it('discloses scope through a native details element, not a daisyUI component class', () => {
    const { container } = render(<PlaceholderPage />);

    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.className).not.toContain('collapse');
    expect(details?.className).not.toContain('btn');
  });
});
