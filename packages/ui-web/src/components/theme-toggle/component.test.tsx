import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './component';
import type { ThemeTogglePreference } from './types';

describe('ThemeToggle', () => {
  it('renders as a native <button> announcing the current preference and the next one', () => {
    render(<ThemeToggle preference="black" onPreferenceChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Theme: dark — switch to light' });
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('title', 'Theme: dark — switch to light');
  });

  it('cycles dark -> light on click', () => {
    const onPreferenceChange = vi.fn();
    render(<ThemeToggle preference="black" onPreferenceChange={onPreferenceChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Theme: dark/ }));

    expect(onPreferenceChange).toHaveBeenCalledTimes(1);
    expect(onPreferenceChange).toHaveBeenCalledWith('wireframe');
  });

  it('cycles light -> system on click', () => {
    const onPreferenceChange = vi.fn();
    render(<ThemeToggle preference="wireframe" onPreferenceChange={onPreferenceChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Theme: light — switch to system' }));

    expect(onPreferenceChange).toHaveBeenCalledWith('system');
  });

  it('cycles system -> dark on click, closing the loop', () => {
    const onPreferenceChange = vi.fn();
    render(<ThemeToggle preference="system" onPreferenceChange={onPreferenceChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Theme: system — switch to dark' }));

    expect(onPreferenceChange).toHaveBeenCalledWith('black');
  });

  it('is controlled -- re-rendering with the next preference updates the accessible name', () => {
    const { rerender } = render(
      <ThemeToggle preference="black" onPreferenceChange={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /Theme: dark/ })).toBeInTheDocument();

    rerender(<ThemeToggle preference="wireframe" onPreferenceChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Theme: light/ })).toBeInTheDocument();

    rerender(<ThemeToggle preference="system" onPreferenceChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Theme: system/ })).toBeInTheDocument();
  });

  it('walks the full dark -> light -> system -> dark cycle across three clicks', () => {
    const cycle: ThemeTogglePreference[] = [];
    let preference: ThemeTogglePreference = 'black';
    const onPreferenceChange = vi.fn((next: ThemeTogglePreference) => {
      cycle.push(next);
      preference = next;
    });

    const { rerender } = render(
      <ThemeToggle preference={preference} onPreferenceChange={onPreferenceChange} />
    );

    fireEvent.click(screen.getByRole('button'));
    rerender(<ThemeToggle preference={preference} onPreferenceChange={onPreferenceChange} />);
    fireEvent.click(screen.getByRole('button'));
    rerender(<ThemeToggle preference={preference} onPreferenceChange={onPreferenceChange} />);
    fireEvent.click(screen.getByRole('button'));

    expect(cycle).toEqual(['wireframe', 'system', 'black']);
  });
});
