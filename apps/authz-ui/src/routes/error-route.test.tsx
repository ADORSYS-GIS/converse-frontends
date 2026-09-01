import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorRoute } from './error-route';

describe('ErrorRoute', () => {
  it('renders a sentence-case failure statement, never a raw error code', () => {
    render(<ErrorRoute />);

    expect(screen.getByText('Sign-in unavailable')).not.toBeNull();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Unable to complete sign-in. Please try again.');
  });
});
