import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPEC_ACCENT, SPEC_GREY_RAMP } from '../../chart-tokens';
import { DonutChart } from './component';
import type { DonutSlice } from './types';

function slice(key: string, label: string, value: number, breached = false): DonutSlice {
  return { key, label, value, breached };
}

const THREE_SLICES = [
  slice('a', 'project-a', 60),
  slice('b', 'project-b', 30),
  slice('c', 'project-c', 10),
];

describe('DonutChart', () => {
  it('renders a ring-geometry skeleton and a muted caption for an empty slice list, no wedges', () => {
    const { container } = render(<DonutChart slices={[]} width={200} height={200} />);

    expect(screen.getByText('No spend in this range.')).toBeInTheDocument();
    expect(container.querySelector('circle')).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('renders a custom empty message when supplied', () => {
    render(<DonutChart slices={[]} width={200} height={200} emptyMessage="Nothing here yet." />);

    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('treats an all-zero slice list as empty (no division-by-zero wedges)', () => {
    const { container } = render(
      <DonutChart
        slices={[slice('a', 'project-a', 0), slice('b', 'project-b', 0)]}
        width={200}
        height={200}
      />
    );

    expect(container.querySelectorAll('path')).toHaveLength(0);
    expect(screen.getByText('No spend in this range.')).toBeInTheDocument();
  });

  it('colours each wedge by rank via the spec ramp, in series order, when nothing is selected/breached', () => {
    const { container } = render(<DonutChart slices={THREE_SLICES} width={200} height={200} />);

    const wedges = container.querySelectorAll('path[role="button"]');
    expect(wedges).toHaveLength(3);
    expect(wedges[0]).toHaveAttribute('fill', SPEC_GREY_RAMP[0]);
    expect(wedges[1]).toHaveAttribute('fill', SPEC_GREY_RAMP[1]);
    expect(wedges[2]).toHaveAttribute('fill', SPEC_GREY_RAMP[2]);
  });

  it('separates every wedge with a floor-coloured hairline stroke', () => {
    const { container } = render(<DonutChart slices={THREE_SLICES} width={200} height={200} />);

    for (const wedge of container.querySelectorAll('path[role="button"]')) {
      expect(wedge).toHaveAttribute('stroke', 'var(--color-muted)');
    }
  });

  it('renders exactly one accent wedge when a slice is breached (single-orange invariant)', () => {
    const { container } = render(
      <DonutChart
        slices={[THREE_SLICES[0], { ...THREE_SLICES[1], breached: true }, THREE_SLICES[2]]}
        width={200}
        height={200}
      />
    );

    const accentWedges = Array.from(container.querySelectorAll('path[role="button"]')).filter(
      (el) => el.getAttribute('fill') === SPEC_ACCENT
    );
    expect(accentWedges).toHaveLength(1);
  });

  it('still renders exactly one accent wedge when two slices are breached at once', () => {
    const { container } = render(
      <DonutChart
        slices={[
          { ...THREE_SLICES[0], breached: true },
          { ...THREE_SLICES[1], breached: true },
          THREE_SLICES[2],
        ]}
        width={200}
        height={200}
      />
    );

    const accentWedges = Array.from(container.querySelectorAll('path[role="button"]')).filter(
      (el) => el.getAttribute('fill') === SPEC_ACCENT
    );
    expect(accentWedges).toHaveLength(1);
  });

  it('renders the legend with one selectable entry per slice', () => {
    render(<DonutChart slices={THREE_SLICES} width={200} height={200} />);

    expect(screen.getByRole('button', { name: 'project-a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'project-c' })).toBeInTheDocument();
  });

  it('every wedge is a focusable, keyboard-activatable button (uncontrolled selection)', () => {
    let selected: string | null = null;
    const { container } = render(
      <DonutChart
        slices={THREE_SLICES}
        width={200}
        height={200}
        onSelectSlice={(key) => {
          selected = key;
        }}
      />
    );

    const wedges = container.querySelectorAll('path[role="button"]');
    for (const wedge of wedges) {
      expect(wedge).toHaveAttribute('tabindex', '0');
    }

    fireEvent.keyDown(wedges[1], { key: 'Enter' });
    expect(selected).toBe('b');

    const accentWedges = Array.from(wedges).filter((el) => el.getAttribute('fill') === SPEC_ACCENT);
    expect(accentWedges).toHaveLength(1);
  });

  it('clicking a wedge calls onSelectSlice and highlights it as the accent', () => {
    let selected: string | null = null;
    const { container } = render(
      <DonutChart
        slices={THREE_SLICES}
        width={200}
        height={200}
        onSelectSlice={(key) => {
          selected = key;
        }}
      />
    );

    const wedges = container.querySelectorAll('path[role="button"]');
    fireEvent.click(wedges[2]);
    expect(selected).toBe('c');
    expect(wedges[2]).toHaveAttribute('fill', SPEC_ACCENT);

    // clicking the same wedge again deselects it
    fireEvent.click(wedges[2]);
    expect(selected).toBeNull();
  });

  it('selecting a legend entry calls onSelectSlice and turns exactly that wedge to the accent', () => {
    let selected: string | null = null;
    const { container } = render(
      <DonutChart
        slices={THREE_SLICES}
        width={200}
        height={200}
        onSelectSlice={(key) => {
          selected = key;
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'project-b' }));
    expect(selected).toBe('b');

    const accentWedges = Array.from(container.querySelectorAll('path[role="button"]')).filter(
      (el) => el.getAttribute('fill') === SPEC_ACCENT
    );
    expect(accentWedges).toHaveLength(1);
  });

  it('is controlled when selectedKey is passed: an external state change re-highlights the wedge', () => {
    const { container, rerender } = render(
      <DonutChart slices={THREE_SLICES} width={200} height={200} selectedKey={null} />
    );

    let accentWedges = Array.from(container.querySelectorAll('path[role="button"]')).filter(
      (el) => el.getAttribute('fill') === SPEC_ACCENT
    );
    expect(accentWedges).toHaveLength(0);

    rerender(<DonutChart slices={THREE_SLICES} width={200} height={200} selectedKey="a" />);

    accentWedges = Array.from(container.querySelectorAll('path[role="button"]')).filter(
      (el) => el.getAttribute('fill') === SPEC_ACCENT
    );
    expect(accentWedges).toHaveLength(1);
    expect(accentWedges[0]).toHaveAttribute('aria-label', expect.stringContaining('project-a'));
  });

  it('renders the centre metric and label', () => {
    render(
      <DonutChart
        slices={THREE_SLICES}
        width={200}
        height={200}
        centreMetric="$142.55"
        centreLabel="TOTAL"
      />
    );

    expect(screen.getByText('$142.55')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
  });
});
