import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RowActionGroup } from './component';

describe('RowActionGroup', () => {
  it('renders each action as a button in order', () => {
    render(
      <RowActionGroup
        actions={[
          { key: 'rotate', label: 'Rotate', onClick: () => {} },
          { key: 'revoke', label: 'Revoke', onClick: () => {}, emphasis: 'strong' },
          { key: 'del', label: 'Del', onClick: () => {}, emphasis: 'muted' },
        ]}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Rotate', 'Revoke', 'Del']);
  });

  it('inserts a diagonal separator between actions but not before the first', () => {
    const { container } = render(
      <RowActionGroup
        actions={[
          { key: 'rotate', label: 'Rotate', onClick: () => {} },
          { key: 'revoke', label: 'Revoke', onClick: () => {} },
        ]}
      />,
    );

    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators).toHaveLength(1);
  });

  it('fires the action click handler', () => {
    const onClick = vi.fn();
    render(<RowActionGroup actions={[{ key: 'revoke', label: 'Revoke', onClick }]} />);

    screen.getByRole('button', { name: 'Revoke' }).click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('emphasises revoke as strong and mutes del', () => {
    render(
      <RowActionGroup
        actions={[
          { key: 'rotate', label: 'Rotate', onClick: () => {}, emphasis: 'default' },
          { key: 'revoke', label: 'Revoke', onClick: () => {}, emphasis: 'strong' },
          { key: 'del', label: 'Del', onClick: () => {}, emphasis: 'muted' },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Revoke' })).toHaveClass('text-ink');
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveClass('text-soft');
    expect(screen.getByRole('button', { name: 'Del' })).toHaveClass('text-subtle');
  });

  it('respects disabled actions', () => {
    render(
      <RowActionGroup
        actions={[{ key: 'revoke', label: 'Revoke', onClick: () => {}, disabled: true }]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Revoke' })).toBeDisabled();
  });

  it('exposes a named group for assistive tech', () => {
    render(<RowActionGroup actions={[{ key: 'revoke', label: 'Revoke', onClick: () => {} }]} />);

    expect(screen.getByRole('group', { name: 'Row actions' })).toBeInTheDocument();
  });
});
