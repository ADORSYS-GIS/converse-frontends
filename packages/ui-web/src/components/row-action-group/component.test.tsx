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
          { key: 'del', label: 'Delete', onClick: () => {}, emphasis: 'muted' },
        ]}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Rotate', 'Revoke', 'Delete']);
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

    // The tick is `row-action-group > button + button::before` (theme.css), so it is a fact about
    // the GROUP rather than a class the first button has to be told not to wear — which is why
    // there is nothing index-dependent left to assert on the buttons themselves. What still has
    // to hold is that it costs no node: no separator element, of any kind, in the tree.
    expect(container.firstElementChild).toHaveClass('row-action-group');
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveClass('row-action');
    expect(screen.getByRole('button', { name: 'Revoke' })).toHaveClass('row-action');
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  // The Base UI `separator` refusal, pinned. Re-taken against the shipped 1.7.0 source on
  // 2026-08-29: Separator's entire contribution is the announced role, this group renders once per
  // ledger ROW, and 1.7.0 exposes no decorative flag — so adopting it would announce roughly a
  // hundred separators across a fifty-key ledger to describe a 1px tick. `src/base-ui-adoption.
  // test.ts` keeps the ledger entry open with that reason; this asserts the resulting DOM.
  it('announces no separator to assistive tech — the tick is decoration, not structure', () => {
    const { container } = render(
      <RowActionGroup
        actions={[
          { key: 'rotate', label: 'Rotate', onClick: () => {} },
          { key: 'revoke', label: 'Revoke', onClick: () => {} },
          { key: 'del', label: 'Delete', onClick: () => {} },
        ]}
      />
    );

    expect(screen.queryAllByRole('separator')).toHaveLength(0);
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(0);
    // Every element inside the group is either the group itself or one of its three buttons.
    expect(container.querySelectorAll('*')).toHaveLength(4);
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
          { key: 'del', label: 'Delete', onClick: () => {}, emphasis: 'muted' },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Revoke' })).toHaveClass('text-ink');
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveClass('text-soft');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('text-subtle');
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
