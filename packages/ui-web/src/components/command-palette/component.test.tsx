import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandPalette, CommandPaletteTrigger } from './component';
import type { CommandPaletteGroup } from './types';

// cmdk measures `Command.List`'s height via `ResizeObserver` (the `--cmdk-list-height` CSS
// variable) with no availability guard -- jsdom, this project's test environment, does not
// implement `ResizeObserver` at all (same gap `use-resize-observer.test.tsx` stubs for its own
// hook). A no-op stub is enough: the assertions below don't depend on the measured height.
class FakeResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  global.ResizeObserver = FakeResizeObserver;
  // cmdk scrolls the active item into view on selection-change -- jsdom has no layout engine and
  // does not implement `scrollIntoView` at all.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  // @ts-expect-error -- restoring the ambient global after each test.
  delete global.ResizeObserver;
});

function groups(onSelect: (key: string) => void): CommandPaletteGroup[] {
  return [
    {
      key: 'navigate',
      heading: 'Navigate',
      items: [
        { key: 'overview', label: 'Overview', onSelect: () => onSelect('overview') },
        { key: 'api-keys', label: 'Api-Keys', onSelect: () => onSelect('api-keys') },
        { key: 'manage', label: 'Manage', onSelect: () => onSelect('manage') },
      ],
    },
    {
      key: 'actions',
      heading: 'Actions',
      items: [{ key: 'sign-out', label: 'Sign out', onSelect: () => onSelect('sign-out') }],
    },
  ];
}

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} onOpenChange={vi.fn()} groups={groups(vi.fn())} />);

    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
  });

  it('renders every group and item when open', () => {
    render(<CommandPalette open onOpenChange={vi.fn()} groups={groups(vi.fn())} />);

    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Api-Keys')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('filters items by the free-text query', async () => {
    render(<CommandPalette open onOpenChange={vi.fn()} groups={groups(vi.fn())} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'man' } });

    await waitFor(() => expect(screen.getByText('Manage')).toBeInTheDocument());
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });

  it('shows the empty message, not a blank list, when nothing matches', async () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        groups={groups(vi.fn())}
        emptyMessage="Nothing here."
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz-no-match' } });

    await waitFor(() => expect(screen.getByText('Nothing here.')).toBeInTheDocument());
  });

  it('fires the item onSelect and closes the palette when an item is chosen', () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} groups={groups(onSelect)} />);

    fireEvent.click(screen.getByText('Sign out'));

    expect(onSelect).toHaveBeenCalledWith('sign-out');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('moves the active item with the arrow keys and selects it with Enter', async () => {
    const onSelect = vi.fn();
    render(<CommandPalette open onOpenChange={vi.fn()} groups={groups(onSelect)} />);

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    await waitFor(() =>
      expect(screen.getByText('Api-Keys').closest('[cmdk-item]')).toHaveAttribute(
        'data-selected',
        'true'
      )
    );
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('api-keys');
  });

  it('calls onOpenChange(false) on Escape', () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} groups={groups(vi.fn())} />);

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape', code: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // v2 visual pass (owner review 2026-08-31): a row's own icon and shortcut chip, and the
  // footer's fixed ↑↓ / ↵ / esc hints -- see component.tsx's own docstring for the full brief.
  it('renders a row icon when the item supplies one, and reserves the column when it does not', () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        groups={[
          {
            key: 'navigate',
            heading: 'Navigate',
            items: [
              {
                key: 'overview',
                label: 'Overview',
                icon: <svg data-testid="overview-icon" />,
                onSelect: vi.fn(),
              },
              { key: 'api-keys', label: 'Api-Keys', onSelect: vi.fn() },
            ],
          },
        ]}
      />
    );

    expect(screen.getByTestId('overview-icon')).toBeInTheDocument();
    expect(screen.getByText('Api-Keys')).toBeInTheDocument();
  });

  it("renders a row's shortcut as a kbd chip instead of plain hint text", () => {
    render(
      <CommandPalette
        open
        onOpenChange={vi.fn()}
        groups={[
          {
            key: 'actions',
            heading: 'Actions',
            items: [{ key: 'new-key', label: 'New key', shortcut: 'N', onSelect: vi.fn() }],
          },
        ]}
      />
    );

    const chip = screen.getByText('N');
    expect(chip.tagName).toBe('KBD');
  });

  it('renders the fixed footer hint row', () => {
    render(<CommandPalette open onOpenChange={vi.fn()} groups={groups(vi.fn())} />);

    // Lower-case, unlike the fixture's own "Navigate" group heading (`groups`, above) -- the
    // task brief's own casing ("↑↓ navigate · ↵ select · esc"), which also keeps this query from
    // colliding with the heading text.
    expect(screen.getByText('navigate')).toBeInTheDocument();
    expect(screen.getByText('select')).toBeInTheDocument();
    expect(screen.getAllByText('esc').length).toBeGreaterThan(0);
  });

  // Owner ruling, 2026-08-31 (issue #368): "10px looks good for the command palette" — the
  // floating-overlay radius token (`OVERLAY_FLOATING_CLASS`, `lib/overlay.ts`), not the flush 2px
  // `OVERLAY_CLASS` contract every DOCKED overlay (Dialog, the bottom sheet, Tooltip) still
  // renders at.
  it('renders the panel at the floating-overlay radius, not the flush 2px contract', () => {
    render(<CommandPalette open onOpenChange={vi.fn()} groups={groups(vi.fn())} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('rounded-(--radius-overlay-floating)');
    expect(dialog.className).not.toMatch(/rounded-\[2px\]/);
  });
});

describe('CommandPaletteTrigger', () => {
  it('renders the shortcut hint and fires onClick', () => {
    const onClick = vi.fn();
    render(<CommandPaletteTrigger onClick={onClick} />);

    expect(screen.getByText('⌘K')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open command palette' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('accepts a platform-specific shortcut hint', () => {
    render(<CommandPaletteTrigger onClick={vi.fn()} shortcutHint="Ctrl K" />);

    expect(screen.getByText('Ctrl K')).toBeInTheDocument();
  });
});
