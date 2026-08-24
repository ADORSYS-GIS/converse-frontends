import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartTooltip } from './component';

describe('ChartTooltip', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(
      <ChartTooltip visible={false} x={10} y={10} rows={[{ key: 'a', label: 'A', value: '1' }]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no rows, even if visible', () => {
    const { container } = render(<ChartTooltip visible x={10} y={10} rows={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title and one row per entry with label and value', () => {
    render(
      <ChartTooltip
        visible
        x={100}
        y={80}
        title="Aug 21"
        rows={[
          { key: 'a', label: 'project-a', value: '$212.40' },
          { key: 'b', label: 'project-b', value: '$88.00' },
        ]}
      />,
    );

    expect(screen.getByText('Aug 21')).toBeInTheDocument();
    expect(screen.getByText('project-a')).toBeInTheDocument();
    expect(screen.getByText('$212.40')).toBeInTheDocument();
    expect(screen.getByText('project-b')).toBeInTheDocument();
    expect(screen.getByText('$88.00')).toBeInTheDocument();
  });

  it('omits the title row when no title is given', () => {
    const { container } = render(
      <ChartTooltip visible x={100} y={80} rows={[{ key: 'a', label: 'project-a', value: '$1.00' }]} />,
    );

    // Only the label/value row should exist inside the card, no title span.
    expect(container.querySelectorAll('.text-subtle')).toHaveLength(0);
  });

  it('clamps left position within containerWidth', () => {
    const { container } = render(
      <ChartTooltip
        visible
        x={2}
        y={50}
        containerWidth={200}
        width={168}
        rows={[{ key: 'a', label: 'a', value: '1' }]}
      />,
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.style.left).toBe('4px');
  });
});
