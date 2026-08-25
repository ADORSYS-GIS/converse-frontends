import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScopeRail } from './component';
import { scopeRailFixture } from './fixtures';

describe('ScopeRail', () => {
  it('echoes the active account and project', () => {
    render(<ScopeRail {...scopeRailFixture} />);

    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('gateway-prod')).toBeInTheDocument();
  });

  it('is read-only — it owns no control of its own', () => {
    const { container } = render(<ScopeRail {...scopeRailFixture} />);

    expect(container.querySelectorAll('button, select, input')).toHaveLength(0);
  });
});
