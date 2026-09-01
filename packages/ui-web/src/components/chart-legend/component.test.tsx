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

  // ADR 0010 Decision 3c: `SPEC_*` are `var(--…)` strings now, not hex literals -- jsdom stores
  // an unrecognized custom-property value verbatim on `.style.backgroundColor` rather than
  // normalizing it to `rgb(...)`, so the assertions compare directly against the constant.
  it('colours swatches by rank via the spec ramp when nothing is selected/breached', () => {
    const { container } = render(<ChartLegend items={ITEMS} />);

    const swatches = container.querySelectorAll('[aria-hidden="true"]');
    expect((swatches[0] as HTMLElement).style.backgroundColor).toBe(SPEC_GREY_RAMP[0]);
    expect((swatches[1] as HTMLElement).style.backgroundColor).toBe(SPEC_GREY_RAMP[1]);
    expect((swatches[2] as HTMLElement).style.backgroundColor).toBe(SPEC_GREY_RAMP[2]);
  });

  it('gives the selected entry the accent swatch and ink label, at most once', () => {
    render(<ChartLegend items={ITEMS} selectedKey="b" />);

    const selectedButton = screen.getByRole('button', { name: 'project-b' });
    const selectedSwatch = selectedButton.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(selectedSwatch.style.backgroundColor).toBe(SPEC_ACCENT);
    // The `ink` label is `series-row[data-emphasized="true"] .series-label` (theme.css), shared
    // with `ShareBar` — so the assertion is that the row is marked emphasised and that the label
    // it emphasises is the right one.
    expect(selectedButton).toHaveAttribute('data-emphasized', 'true');
    expect(selectedButton.querySelector('.series-label')).toHaveTextContent('project-b');

    const otherButton = screen.getByRole('button', { name: 'project-a' });
    const otherSwatch = otherButton.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(otherSwatch.style.backgroundColor).not.toBe(SPEC_ACCENT);
  });

  it('renders a breached entry in the accent even when not selected, with an "over ceiling" label', () => {
    render(<ChartLegend items={[ITEMS[0], { ...ITEMS[1], breached: true }, ITEMS[2]]} />);

    const breachedButton = screen.getByRole('button', { name: 'project-b, over ceiling' });
    const swatch = breachedButton.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe(SPEC_ACCENT);
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
