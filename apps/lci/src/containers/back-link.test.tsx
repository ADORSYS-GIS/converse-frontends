import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BackLink } from './back-link';

describe('BackLink', () => {
  it('links to the given href with the given label', () => {
    render(<BackLink href="/repositories" label="Repositories" />);

    expect(screen.getByRole('link', { name: 'Repositories' })).toHaveAttribute(
      'href',
      '/repositories'
    );
  });
});
