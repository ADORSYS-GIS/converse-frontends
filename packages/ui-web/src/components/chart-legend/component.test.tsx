import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SPEC_ACCENT, SPEC_GREY_RAMP } from '../../chart-tokens';
import { ChartLegend } from './component';

const ITEMS = [
  { key: 'a', label: 'project-a', value: '$212.40' },
  { key: 'b', label: 'project-b', value: '$88.00' },
  { key: 'c', label: 'project-c', value: '$44.10' },
];

describe('ChartLegend', () => {
  it('renders nothing for fewer than two series', () => {
    const { container } = render(<ChartLegend items={[ITEMS[0]]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one keyboard-accessible button per series with its label and value', () => {
    render(<ChartLegend items={ITEMS} />);

    for (const item of ITEMS) {
      const button = screen.getByRole('button', { name: item.label });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(item.value);
    }
  });

  it('colours swatches by rank via the spec ramp when nothing is selected/breached', () => {
    const { container } = render(<ChartLegend items={ITEMS} />);

    const swatches = container.querySelectorAll('[aria-hidden="true"]');
    expect((swatches[0] as HTMLElement).style.backgroundColor).toBe(hexToRgb(SPEC_GREY_RAMP[0]));
    expect((swatches[1] as HTMLElement).style.backgroundColor).toBe(hexToRgb(SPEC_GREY_RAMP[1]));
    expect((swatches[2] as HTMLElement).style.backgroundColor).toBe(hexToRgb(SPEC_GREY_RAMP[2]));
  });

  it('gives the selected entry the accent swatch and ink label, at most once', () => {
    render(<ChartLegend items={ITEMS} selectedKey="b" />);

    const selectedButton = screen.getByRole('button', { name: 'project-b' });
    const selectedSwatch = selectedButton.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(selectedSwatch.style.backgroundColor).toBe(hexToRgb(SPEC_ACCENT));
    expect(selectedButton.querySelector('.text-ink')).toHaveTextContent('project-b');

    const otherButton = screen.getByRole('button', { name: 'project-a' });
    const otherSwatch = otherButton.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(otherSwatch.style.backgroundColor).not.toBe(hexToRgb(SPEC_ACCENT));
  });

  it('renders a breached entry in the accent even when not selected, with an "over ceiling" label', () => {
    render(<ChartLegend items={[ITEMS[0], { ...ITEMS[1], breached: true }, ITEMS[2]]} />);

    const breachedButton = screen.getByRole('button', { name: 'project-b, over ceiling' });
    const swatch = breachedButton.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe(hexToRgb(SPEC_ACCENT));
  });

  it('fires onSelectKey with the toggled key, and clears it on re-click', () => {
    const onSelectKey = vi.fn();
    render(<ChartLegend items={ITEMS} selectedKey={null} onSelectKey={onSelectKey} />);

    screen.getByRole('button', { name: 'project-a' }).click();
    expect(onSelectKey).toHaveBeenCalledWith('a');
  });

  it('renders disabled, non-interactive buttons when onSelectKey is omitted', () => {
    render(<ChartLegend items={ITEMS} />);

    expect(screen.getByRole('button', { name: 'project-a' })).toBeDisabled();
  });
});

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
