import { Menu } from '@base-ui/react/menu';
import React from 'react';

import { cn } from '../../cn';
import type { AccountMenuProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 `ConsoleHeader` "account menu" + the
// console-ui skill (ADR 0010 Decision 2: Base UI owns behaviour -- Menu here, never a
// hand-written focus trap or roving tabindex). The avatar + email identity block already in the
// header *is* the trigger, so nothing about the header's visual footprint changes when this menu
// closes. Popup is a `surface` panel, radius 2, no shadow -- separation from the identity line to
// "Sign out" is a `raised` hairline, per the skill's panel-separation rule, never a border/shadow.
export function AccountMenu({
  name,
  email,
  initials,
  onSignOut,
  triggerLabel,
  className,
}: AccountMenuProps) {
  const label = name ?? email;

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          'flex items-center gap-3 rounded-[2px] font-mono outline-none',
          'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-chrome',
          className
        )}
        aria-label={triggerLabel ?? (label ? `Account menu — ${label}` : 'Account menu')}>
        {email ? <span className="hidden text-[11px] text-subtle md:inline">{email}</span> : null}
        <span
          aria-hidden="true"
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised text-[10px] text-soft">
          {initials}
        </span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className="z-50 outline-none">
          <Menu.Popup className="w-[220px] rounded-[2px] bg-surface py-1 font-mono outline-none">
            {name || email ? (
              <div role="presentation" className="flex flex-col gap-0.5 px-3 py-2">
                {name ? (
                  <span className="truncate text-xs text-ink" title={name}>
                    {name}
                  </span>
                ) : null}
                {email ? (
                  <span className="truncate text-[11px] text-subtle" title={email}>
                    {email}
                  </span>
                ) : null}
              </div>
            ) : null}

            <Menu.Separator className="mx-1 my-1 h-px bg-raised" />

            <Menu.Item
              className={cn(
                'cursor-pointer px-3 py-2 text-[11px] text-soft outline-none transition-colors',
                'data-[highlighted]:bg-raised data-[highlighted]:text-ink'
              )}
              onClick={onSignOut}>
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
