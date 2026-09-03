import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPEC_BASELINE, SPEC_GRID } from '../../chart-tokens';
import { ChartAxisBottom, ChartAxisLeft } from './component';

describe('ChartAxisBottom', () => {
  it('renders nothing for an empty tick set (empty-state chart)', () => {
    const { container } = render(
      <svg>
        <ChartAxisBottom y={10} ticks={[]} />
      </svg>
    );

    expect(container.querySelector('line')).not.toBeInTheDocument();
  });

  it('renders a baseline and one tick label per tick, at 9px', () => {
    render(
      <svg>
        <ChartAxisBottom
          y={20}
          ticks={[
            { position: 10, label: 'Mon' },
            { position: 100, label: 'Tue' },
          ]}
        />
      </svg>
    );

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toHaveAttribute('font-size', '9');
  });

  it('draws the baseline in the spec --line colour, not a gridline colour', () => {
    const { container } = render(
      <svg>
        <ChartAxisBottom y={20} x1={0} x2={100} ticks={[{ position: 10, label: 'Mon' }]} />
      </svg>
    );

    const baseline = container.querySelector('line');
    // ADR 0010 Decision 3c: theme-variable-driven, not a hex literal -- `--color-border` resolves
    // to `#3a3a3a` in `black` / `#cfcfcf` in `wireframe` via theme.css.
    expect(baseline).toHaveAttribute('stroke', SPEC_BASELINE);
  });

  it('draws gridlines in the spec --raised colour when gridHeight is set', () => {
    const { container } = render(
      <svg>
        <ChartAxisBottom y={20} gridHeight={40} ticks={[{ position: 10, label: 'Mon' }]} />
      </svg>
    );

    const lines = container.querySelectorAll('line');
    // First line is the baseline (--line); the per-tick gridline is --raised.
    expect(lines[1]).toHaveAttribute('stroke', SPEC_GRID);
  });
});

describe('ChartAxisLeft', () => {
  it('renders nothing for an empty tick set', () => {
    const { container } = render(
      <svg>
        <ChartAxisLeft x={10} ticks={[]} />
      </svg>
    );

    expect(container.querySelector('line')).not.toBeInTheDocument();
  });

  it('renders one right-anchored tick label per tick', () => {
    render(
      <svg>
        <ChartAxisLeft
          x={40}
          ticks={[
            { position: 10, label: '$100' },
            { position: 50, label: '$0' },
          ]}
        />
      </svg>
    );

    expect(screen.getByText('$100')).toHaveAttribute('text-anchor', 'end');
    expect(screen.getByText('$0')).toBeInTheDocument();
  });
});
