import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './component';
import type { PageHeaderProps } from './types';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="API keys" />);
    expect(screen.getByRole('heading', { name: 'API keys' })).toBeInTheDocument();
  });

  it('omits the subtitle when none is given', () => {
    render(<PageHeader title="API keys" />);
    expect(screen.queryByText(/adorsys-gis/)).not.toBeInTheDocument();
  });

  it('renders the subtitle under the title', () => {
    render(<PageHeader title="API keys" subtitle="adorsys-gis / gateway-prod" />);
    expect(screen.getByText('adorsys-gis / gateway-prod')).toBeInTheDocument();
  });

  it('renders no trailing cluster when there is no action', () => {
    const { container } = render(<PageHeader title="API keys" />);
    expect(container.querySelector('.page-header-action')).not.toBeInTheDocument();
  });

  it('renders the action in the trailing cluster', () => {
    render(<PageHeader title="API keys" action={<button type="button">+ New key</button>} />);

    const cluster = screen.getByRole('button', { name: '+ New key' }).parentElement;
    expect(cluster).toHaveClass('page-header-action');
  });

  // The `controls` slot is gone (ADR 0015 amendment A2) — filters are `PageControls`, a sibling row
  // on the floor. A screen that still passed one would be silently dropping its own filters, so the
  // prop surface has to stay shut. Enforced by `tsc`, not by a runtime expectation: `never` is
  // uninhabited, so re-adding `controls` to `PageHeaderProps` fails typecheck on the next line.
  it('exposes no controls slot', () => {
    type NoControlsSlot = 'controls' extends keyof PageHeaderProps ? never : true;
    const shut: NoControlsSlot = true;
    expect(shut).toBe(true);
  });
});
