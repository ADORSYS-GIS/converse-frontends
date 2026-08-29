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
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Rotate', 'Revoke', 'Del']);
  });

  // The diagonal hairline is a `::before` on every action after the first — decoration lives in
  // CSS, not in the DOM (and daisy `join`/`join-item` is rejected here: `join-item` draws a real
  // 1px border per item, which is the opposite treatment). It therefore has no node of its own.
  it('draws a diagonal separator on every action but the first, and adds no DOM node for it', () => {
    const { container } = render(
      <RowActionGroup
        actions={[
          { key: 'rotate', label: 'Rotate', onClick: () => {} },
          { key: 'revoke', label: 'Revoke', onClick: () => {} },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Rotate' })).not.toHaveClass('before:rotate-[20deg]');
    expect(screen.getByRole('button', { name: 'Revoke' })).toHaveClass('before:rotate-[20deg]');
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('does not adopt daisy join/join-item (it would border every action)', () => {
    const { container } = render(
      <RowActionGroup
        actions={[
          { key: 'rotate', label: 'Rotate', onClick: () => {} },
          { key: 'revoke', label: 'Revoke', onClick: () => {} },
        ]}
      />
    );

    expect(container.querySelector('.join')).toBeNull();
    expect(container.querySelector('.join-item')).toBeNull();
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
      />
    );

    expect(screen.getByRole('button', { name: 'Revoke' })).toHaveClass('text-ink');
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveClass('text-soft');
    expect(screen.getByRole('button', { name: 'Del' })).toHaveClass('text-subtle');
  });

  it('respects disabled actions', () => {
    render(
      <RowActionGroup
        actions={[{ key: 'revoke', label: 'Revoke', onClick: () => {}, disabled: true }]}
      />
    );

    expect(screen.getByRole('button', { name: 'Revoke' })).toBeDisabled();
  });

  it('exposes a named group for assistive tech', () => {
    render(<RowActionGroup actions={[{ key: 'revoke', label: 'Revoke', onClick: () => {} }]} />);

    expect(screen.getByRole('group', { name: 'Row actions' })).toBeInTheDocument();
  });
});
