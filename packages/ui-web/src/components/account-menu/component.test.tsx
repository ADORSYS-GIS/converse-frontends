import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountMenu } from './component';
import type { AccountMenuProps } from './types';

function renderMenu(overrides: Partial<AccountMenuProps> = {}) {
  const onSignOut = vi.fn();
  const { container } = render(
    <AccountMenu
      name="Sam Lambou"
      email="sam@adorsys.com"
      initials="SL"
      onSignOut={onSignOut}
      {...overrides}
    />
  );
  return { onSignOut, container };
}

describe('AccountMenu', () => {
  it('renders an accessible trigger with menu semantics, closed by default', () => {
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'Account menu — Sam Lambou' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens on click and exposes the identity line and Sign out item', async () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));

    const menu = await screen.findByRole('menu');
    expect(screen.getByRole('button', { name: /Account menu/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(within(menu).getByText('Sam Lambou')).toBeInTheDocument();
    expect(within(menu).getByText('sam@adorsys.com')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('renders the trigger as a native <button>, so the platform handles Enter/Space activation', () => {
    renderMenu();

    expect(screen.getByRole('button', { name: /Account menu/ }).tagName).toBe('BUTTON');
  });

  it('fires onSignOut when Sign out is activated and closes the menu', async () => {
    const { onSignOut } = renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    const item = await screen.findByRole('menuitem', { name: 'Sign out' });
    fireEvent.click(item);

    expect(onSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('opens on ArrowDown and closes on Escape without firing onSignOut', async () => {
    const { onSignOut } = renderMenu();
    const trigger = screen.getByRole('button', { name: /Account menu/ });

    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = await screen.findByRole('menu');

    fireEvent.keyDown(menu, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(onSignOut).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('navigates to Sign out with ArrowDown and activates it with Enter', async () => {
    const { onSignOut } = renderMenu();
    const trigger = screen.getByRole('button', { name: /Account menu/ });

    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const menu = await screen.findByRole('menu');
    const item = await screen.findByRole('menuitem', { name: 'Sign out' });

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    await waitFor(() => expect(item).toHaveFocus());

    fireEvent.keyDown(item, { key: 'Enter' });
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the avatar as the trigger when no name/email is supplied', () => {
    render(<AccountMenu initials="··" onSignOut={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
  });

  it('falls back to the email as the identity label when no name is set', () => {
    render(<AccountMenu email="sam@adorsys.com" initials="SL" onSignOut={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Account menu — sam@adorsys.com' })
    ).toBeInTheDocument();
  });

  it('renders no theme section when theme/onThemeChange are omitted', async () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    await screen.findByRole('menu');

    expect(screen.queryByText('Dark')).not.toBeInTheDocument();
    expect(screen.queryByText('System')).not.toBeInTheDocument();
  });

  it('renders the theme section, marking the active preference, when both props are supplied', async () => {
    const onThemeChange = vi.fn();
    renderMenu({ theme: 'wireframe', onThemeChange });

    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    const menu = await screen.findByRole('menu');

    expect(within(menu).getByRole('menuitem', { name: '[Light]' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Dark' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'System' })).toBeInTheDocument();
  });

  it('fires onThemeChange with the selected value and does not close the menu', async () => {
    const onThemeChange = vi.fn();
    renderMenu({ theme: 'black', onThemeChange });

    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    const menu = await screen.findByRole('menu');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Light' }));

    expect(onThemeChange).toHaveBeenCalledTimes(1);
    expect(onThemeChange).toHaveBeenCalledWith('wireframe');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  // Phase 9 — the sidebar footer's full-width identity row (owner review: the email the sidebar
  // footer was missing entirely).
  describe('variant="sidebar"', () => {
    it('renders a full-width row, not the compact header chip', () => {
      renderMenu({ variant: 'sidebar' });

      const trigger = screen.getByRole('button', { name: /Account menu/ });
      expect(trigger).toHaveClass('sidebar-footer-row');
      expect(trigger).not.toHaveClass('btn');
    });

    it('shows the name when present — no `hidden md:inline` gate the top bar variant carries', () => {
      renderMenu({ variant: 'sidebar', name: 'Sam Lambou', email: 'sam@adorsys.com' });

      const name = screen.getByText('Sam Lambou');
      expect(name).not.toHaveClass('hidden');
    });

    it('falls back to the email when there is no name', () => {
      renderMenu({ variant: 'sidebar', name: undefined, email: 'sam@adorsys.com' });

      const email = screen.getByText('sam@adorsys.com');
      expect(email).not.toHaveClass('hidden');
    });

    // Addition 5 (owner screenshot): the identity row rendered a bare initials chip with no
    // text at all — `label` (name, falling back to email) is what was missing.
    it('never renders a bare chip with no identity text, when a name or email is known', () => {
      const { container } = renderMenu({
        variant: 'sidebar',
        name: 'Sam Lambou',
        email: 'sam@adorsys.com',
      });

      expect(container.querySelector('.rail-row-label')).toHaveTextContent('Sam Lambou');
    });

    // Addition 5 — the identity chip used to sit at a THIRD x, matching neither the Search row's
    // icon nor the (now-deleted) Theme row's toggle: `avatar-chip-sm` inside the shared 16px
    // `RAIL_ICON_COLUMN_CLASS` puts it on the exact same grid as every other footer/nav row.
    it('renders the avatar inside the shared 16px icon column, not the full-size chip', () => {
      const { container } = renderMenu({ variant: 'sidebar' });

      expect(container.querySelector('.avatar-chip-sm')).toBeInTheDocument();
      expect(container.querySelector('.avatar-chip')).not.toBeInTheDocument();
    });

    it('shows a trailing chevron so the row reads as opening a menu', () => {
      const { container } = renderMenu({ variant: 'sidebar' });

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('still opens the menu and fires onSignOut', async () => {
      const { onSignOut } = renderMenu({ variant: 'sidebar' });

      fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
      const item = await screen.findByRole('menuitem', { name: 'Sign out' });
      fireEvent.click(item);

      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
