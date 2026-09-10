import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './component';

describe('Pagination', () => {
  it('renders nothing when neither onPrev nor onNext is given', () => {
    const { container } = render(
      <Pagination shown={12} total={23} unit="keys" hasPrev={false} hasNext={true} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Showing X of Y unit" when the total is known', () => {
    render(
      <Pagination
        shown={12}
        total={23}
        unit="keys"
        hasPrev={false}
        hasNext={true}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText('Showing 12 of 23 keys')).toBeInTheDocument();
  });

  it('falls back to "X unit" when the total is unknown', () => {
    render(<Pagination shown={12} unit="keys" hasPrev={false} hasNext={true} onNext={vi.fn()} />);

    expect(screen.getByText('12 keys')).toBeInTheDocument();
    expect(screen.queryByText(/of/)).not.toBeInTheDocument();
  });

  it('disables Previous when hasPrev is false and enables it when true', () => {
    const { rerender } = render(
      <Pagination shown={1} unit="keys" hasPrev={false} hasNext={true} onPrev={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: '‹ Previous' })).toBeDisabled();

    rerender(<Pagination shown={1} unit="keys" hasPrev={true} hasNext={true} onPrev={vi.fn()} />);
    expect(screen.getByRole('button', { name: '‹ Previous' })).toBeEnabled();
  });

  it('disables Next when hasNext is false and enables it when true', () => {
    const { rerender } = render(
      <Pagination shown={1} unit="keys" hasPrev={true} hasNext={false} onNext={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Next ›' })).toBeDisabled();

    rerender(<Pagination shown={1} unit="keys" hasPrev={true} hasNext={true} onNext={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next ›' })).toBeEnabled();
  });

  it('fires onPrev and onNext when clicked', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        shown={1}
        unit="keys"
        hasPrev={true}
        hasNext={true}
        onPrev={onPrev}
        onNext={onNext}
      />
    );

    screen.getByRole('button', { name: '‹ Previous' }).click();
    screen.getByRole('button', { name: 'Next ›' }).click();

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
