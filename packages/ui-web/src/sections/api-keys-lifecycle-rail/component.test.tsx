import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiKeysLifecycleRail } from './component';

describe('ApiKeysLifecycleRail', () => {
  it('states the difference between revoke and delete', () => {
    render(<ApiKeysLifecycleRail />);

    expect(screen.getByText(/Revoke disables a key and keeps its history/)).toBeInTheDocument();
  });

  it('is sentence prose, so it uses the Inter family, not the structural mono', () => {
    render(<ApiKeysLifecycleRail />);

    expect(screen.getByText(/Revoke disables a key/)).toHaveClass('font-sans');
  });
});
