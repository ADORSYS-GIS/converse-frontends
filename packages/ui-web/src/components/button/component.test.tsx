import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './component';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('applies the primary variant classes by default', () => {
    render(<Button>Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-ink');
  });

  it('applies the secondary variant classes', () => {
    render(<Button variant="secondary">Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveClass('border-border');
    expect(button).toHaveClass('text-soft');
    expect(button).not.toHaveClass('bg-primary');
  });

  it('applies the ghost variant classes', () => {
    render(<Button variant="ghost">Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveClass('bg-transparent');
    expect(button).not.toHaveClass('border-border');
    expect(button).not.toHaveClass('bg-primary');
  });

  it('renders as disabled and does not fire the click handler', async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Continue
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeDisabled();

    button.click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('fires the click handler when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Continue</Button>);

    screen.getByRole('button', { name: 'Continue' }).click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
