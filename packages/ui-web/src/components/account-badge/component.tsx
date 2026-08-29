import { Menu } from '@base-ui/react/menu';
import React from 'react';

import { cn } from '../../cn';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { AccountBadgeProps } from './types';

/** How many leading characters of a UUID survive the short form. A v4 UUID's first block is 8
 *  hex digits — enough to tell two accounts apart at a glance, short enough to read as a token
 *  rather than as data. */
const SHORT_ID_LENGTH = 8;

/**
 * `49534505-4c60-4550-83dd-7af22152cec6` → `acct_49534505`.
 *
 * Exported because the page heading and the command palette need the identical short form; two
 * independent truncations of the same id would be two different names for one account.
 */
export function shortAccountId(accountId: string): string {
  if (!accountId) return '—';
  const head = accountId.replace(/-/g, '').slice(0, SHORT_ID_LENGTH);
  return `acct_${head}`;
}

function displayName(name: string | null | undefined, accountId: string) {
  const trimmed = name?.trim();
  return { display: trimmed || shortAccountId(accountId), isFallback: !trimmed };
}

// Contract: owner review 2026-08-29 — the console's ONE rendering of "which account am I in",
// and the only place it can be changed.
//
// Before this, the active account's raw UUID appeared four times on Overview: the header bar, the
// page subtitle, the left rail's `Scope` echo, and the right rail's `Account` filter. Thirty-six
// characters of hex, four times, none of it readable and none of it actionable — the single
// loudest thing on a screen whose actual content was two numbers and a chart. The rail copies and
// the subtitle copy are gone; this is what remains, and it is the header's.
//
// Three rules it encodes:
//
//  1. **Scope is identity, not a filter.** An account is the thing you are inside, like a
//     workspace — not a value you tune alongside range and model. It reads at the top of the
//     chrome, once, and the toolbars' filters narrow *within* it. (Project stays a toolbar
//     parameter, because that is genuinely what it is: you change it constantly, and every screen
//     means something different by it.)
//  2. **Show a name; degrade to a token, never to raw hex.** `name` when the account has one,
//     `acct_49534505` when it does not. The full id stays one hover (`title`) or one click
//     (`onCopyId`) away, which covers the real reason anyone wanted it on screen: pasting it into
//     a support ticket or a CLI flag.
//  3. **A switcher only when there is something to switch to.** Deleting the rail's `Account`
//     dropdown must not delete the ability to change accounts — so with 2+ reachable accounts
//     this is a Base UI `Menu` (ADR 0010 Decision 2: Base UI owns behaviour; never a hand-rolled
//     focus trap). With 0 or 1 it renders as text, because a dropdown whose menu holds a single
//     option is chrome imitating a control.
export function AccountBadge({
  name,
  accountId,
  accounts,
  onSelectAccount,
  onCopyId,
  className,
}: AccountBadgeProps) {
  const { display, isFallback } = displayName(name, accountId);
  const canSwitch = Boolean(onSelectAccount) && (accounts?.length ?? 0) > 1;

  const content = (
    <>
      <span className={cn('font-mono text-xs', isFallback ? 'text-soft' : 'text-ink')}>
        {display}
      </span>
      {/* The name is the identity; the short id is the disambiguator beside it. When the name IS
          the short id there is nothing to disambiguate, so this second line is suppressed rather
          than repeating it. */}
      {!isFallback && accountId ? (
        <span className={cn(LABEL_CLASS, 'hidden md:inline')}>{shortAccountId(accountId)}</span>
      ) : null}
    </>
  );

  if (canSwitch) {
    return (
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Account ${display}. Switch account.`}
          title={accountId || undefined}
          className={cn(
            'hover:bg-raised flex items-center gap-2 rounded-[2px] px-1.5 py-1 outline-hidden transition-colors duration-150 ease-out',
            'focus-visible:ring-primary focus-visible:ring-offset-chrome focus-visible:ring-1 focus-visible:ring-offset-1',
            className
          )}>
          {content}
          <svg
            aria-hidden="true"
            viewBox="0 0 8 8"
            className="stroke-subtle h-2 w-2"
            fill="none"
            strokeWidth="1.4">
            <path d="M1 3l3 3 3-3" />
          </svg>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner align="start" sideOffset={6} className="z-50 outline-hidden">
            <Menu.Popup className="bg-surface w-[240px] rounded-[2px] py-1 font-mono outline-hidden">
              <div role="presentation" className="px-3 py-2">
                <span className={LABEL_CLASS}>Account</span>
              </div>
              {accounts?.map((account) => {
                const active = account.id === accountId;
                const { display: optionLabel } = displayName(account.label, account.id);
                return (
                  <Menu.Item
                    key={account.id}
                    title={account.id}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[11px] outline-hidden transition-colors',
                      active ? 'text-ink' : 'text-soft',
                      'data-[highlighted]:bg-raised data-[highlighted]:text-ink'
                    )}
                    onClick={() => onSelectAccount?.(account.id)}>
                    <span className="truncate">{optionLabel}</span>
                    {/* Selection is a text marker, never a pill or a coloured dot
                        (console-ui skill "States": status is text). */}
                    {active ? (
                      <span aria-hidden="true" className="text-subtle">
                        active
                      </span>
                    ) : null}
                  </Menu.Item>
                );
              })}
              {onCopyId ? (
                <>
                  <Menu.Separator className="bg-raised mx-1 my-1 h-px" />
                  <Menu.Item
                    className={cn(
                      'text-soft cursor-pointer px-3 py-2 text-[11px] outline-hidden transition-colors',
                      'data-[highlighted]:bg-raised data-[highlighted]:text-ink'
                    )}
                    onClick={() => onCopyId(accountId)}>
                    Copy account id
                  </Menu.Item>
                </>
              ) : null}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    );
  }

  if (!onCopyId) {
    return (
      <span title={accountId || undefined} className={cn('flex items-center gap-2', className)}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onCopyId(accountId)}
      title={accountId ? `${accountId} — click to copy` : undefined}
      aria-label={`Account ${display}. Copy full account id.`}
      className={cn(
        'hover:bg-raised flex items-center gap-2 rounded-[2px] px-1.5 py-1 transition-colors duration-150 ease-out',
        className
      )}>
      {content}
    </button>
  );
}
