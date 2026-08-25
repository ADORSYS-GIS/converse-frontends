import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountMenu } from './component';
import type { AccountMenuProps } from './types';

function renderMenu(overrides: Partial<AccountMenuProps> = {}) {
  const onSignOut = vi.fn();
  render(
    <AccountMenu
      name="Sam Lambou"
      email="sam@adorsys.com"
      initials="SL"
      onSignOut={onSignOut}
      {...overrides}
    />
  );
  return { onSignOut };
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
});
