import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardPanel } from '../dashboard-panel';
import { DashboardGrid } from './component';

describe('DashboardGrid', () => {
  it('carries the grid part and nothing hand-written of its own', () => {
    const { container } = render(<DashboardGrid>{null}</DashboardGrid>);
    expect(container.firstElementChild).toHaveClass('dashboard-grid');
    expect(container.firstElementChild?.className).toBe('dashboard-grid');
  });

  /**
   * The span is read off the panel's own `data-span`, by CSS — the grid never inspects or clones
   * its children, which is what lets a panel type declare its own span from YAML without the grid
   * knowing anything about panel types.
   */
  it('lets a panel declare its own span, without the grid inspecting its children', () => {
    const { container } = render(
      <DashboardGrid>
        <DashboardPanel id="wide" title="Wide" span={2}>
          {() => <p>wide</p>}
        </DashboardPanel>
        <DashboardPanel id="narrow" title="Narrow">
          {() => <p>narrow</p>}
        </DashboardPanel>
      </DashboardGrid>
    );

    const items = container.querySelectorAll('.dashboard-grid > .dashboard-panel');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('data-span')).toBe('2');
    expect(items[1].getAttribute('data-span')).toBeNull();
  });

  it('forwards a caller className alongside the grid part', () => {
    const { container } = render(<DashboardGrid className="mt-6">{null}</DashboardGrid>);
    expect(container.firstElementChild).toHaveClass('dashboard-grid');
    expect(container.firstElementChild).toHaveClass('mt-6');
  });
});
