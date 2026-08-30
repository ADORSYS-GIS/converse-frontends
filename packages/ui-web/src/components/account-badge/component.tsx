import { Menu } from '@base-ui/react/menu';
import React from 'react';

import { cn } from '../../cn';
import {
  OVERLAY_CLASS,
  OVERLAY_CURRENT_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_MARKER_CLASS,
  OVERLAY_POSITIONER_CLASS,
  OVERLAY_SECTION_CLASS,
  OVERLAY_SEPARATOR_CLASS,
  OVERLAY_SPLIT_ROW_CLASS,
} from '../../lib/overlay';
import { DATA_CLASS, LABEL_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import type { AccountBadgeProps } from './types';
import { Chevron } from '../chevron';

/** How many leading characters of a UUID survive the short form. A v4 UUID's first block is 8
 *  hex digits — enough to tell two accounts apart at a glance, short enough to read as a token
 *  rather than as data. */
const SHORT_ID_LENGTH = 8;

// The identity line, and the same line when it is also a control — both from `theme.css`.
// `account-chip` IS an identity row (it carries that layout itself), so the control form names
// one part rather than two. The focus ring stays the shared `focus-ring`: it is the console's one
// definition of what focus looks like, and the 1px gap under it is the colour the hosting zone
// (`ConsoleTopBar`/`ConsoleSidebar`) declares via `[--focus-gap:var(--color-chrome)]`, so this
// component no longer has to know it sits on `chrome`.
const ROW_ONLY_CLASS = 'identity-row';
const CHIP_CLASS = 'account-chip focus-ring';

// `variant="sidebar"` (shell brief 2026-08-30 — "the existing AccountBadge behaviour relocated")
// — the SAME identity-row content, worn as a full-width `ConsoleSidebar` row instead of a compact
// header chip. `workspace-switcher-row` already carries the hover fill and hit target; only the
// focus ring is added at the call site, same split `CHIP_CLASS` makes above.
const SIDEBAR_ROW_ONLY_CLASS = 'workspace-switcher-row';
const SIDEBAR_CHIP_CLASS = 'workspace-switcher-row focus-ring';

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
  // A "name" that embeds the account id is not a name — it is a pre-formatted fallback label
  // someone built upstream. Rendering it would defeat this component's only job and, since the
  // short id is appended beside a real name, would print the account twice (live regression,
  // 2026-08-29: `accountScopeLabel`'s "Unnamed account · <uuid>" reached here as `name`).
  const usable = trimmed && accountId ? !trimmed.includes(accountId) : Boolean(trimmed);
  return { display: usable ? trimmed! : shortAccountId(accountId), isFallback: !usable };
}

// The console's one rendering of which account you are in, and the only place it can be changed.
// Replaced four simultaneous renderings of the raw UUID (header, page subline, left-rail Scope
// echo, right-rail Account filter).
//
//  - Scope is identity, not a filter: it reads once at the top of the chrome; toolbars filter
//    within it.
//  - Show a name; degrade to a token (`acct_49534505`), never raw hex. Full id on hover/copy.
//  - A switcher only with 2+ reachable accounts — a menu of one is chrome imitating a control.
//
// Base UI's Menu owns every bit of the switcher's behaviour (focus, typeahead, dismissal); the
// popup's paint is the console's shared overlay contract from lib/overlay.ts, not a local one.
// That is the defect this pass fixed as well as a class count: the popup was painting itself with
// a bare `surface` fill and no hairline, which the console-ui skill bans outright ("Never do: a
// floating overlay without OVERLAY_CLASS") precisely because this menu spans the header AND the
// floor at once, so tonal separation alone leaves its edge indistinct.
export function AccountBadge({
  name,
  accountId,
  accounts,
  onSelectAccount,
  onCopyId,
  variant = 'inline',
  initials,
  className,
}: AccountBadgeProps) {
  const { display, isFallback } = displayName(name, accountId);
  const canSwitch = Boolean(onSelectAccount) && (accounts?.length ?? 0) > 1;
  const sidebar = variant === 'sidebar';
  const rowOnlyClass = sidebar ? SIDEBAR_ROW_ONLY_CLASS : ROW_ONLY_CLASS;
  const chipClass = sidebar ? SIDEBAR_CHIP_CLASS : CHIP_CLASS;

  const nameAndId = (
    <>
      {/* A real name reads at full strength; the generated token is not the account's name, so
          it stays one step back. */}
      <span className={isFallback ? DATA_CLASS : SECTION_TITLE_CLASS}>{display}</span>
      {/* The name is the identity; the short id is the disambiguator beside it. When the name IS
          the short id there is nothing to disambiguate, so this second line is suppressed rather
          than repeating it. Hidden below `md` at the `inline` variant, where the top bar has no
          room for both — the `sidebar` variant only ever renders at `md`+, so it always shows. */}
      {!isFallback && accountId ? (
        <>
          {sidebar ? ' ' : null}
          <span className={cn(LABEL_CLASS, !sidebar && 'hidden md:inline')}>
            {shortAccountId(accountId)}
          </span>
        </>
      ) : null}
    </>
  );

  const content = sidebar ? (
    <>
      {/* The sidebar variant's leading avatar chip — same square-at-radius treatment as the
          identity footer row beside it, so every full-width sidebar row reads as one family. */}
      {initials ? (
        <span aria-hidden="true" className="avatar-chip">
          {initials}
        </span>
      ) : null}
      {/* One flex-shrinking, truncating wrapper so the name+id pair reads as a unit against the
          row's full width, leaving room for the trailing chevron — `rail-row-label` (theme.css),
          the same truncation contract every other rail/sidebar row label already uses, rather
          than a one-off hand-written rule for this call site. */}
      <span className="rail-row-label">{nameAndId}</span>
    </>
  ) : (
    nameAndId
  );

  if (canSwitch) {
    return (
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Account ${display}. Switch account.`}
          title={accountId || undefined}
          className={cn(chipClass, className)}>
          {content}
          <Chevron />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner align="start" sideOffset={6} className={OVERLAY_POSITIONER_CLASS}>
            <Menu.Popup className={cn(OVERLAY_CLASS, 'account-popup')}>
              <div role="presentation" className={OVERLAY_SECTION_CLASS}>
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
                      OVERLAY_ITEM_CLASS,
                      OVERLAY_SPLIT_ROW_CLASS,
                      active && OVERLAY_CURRENT_CLASS
                    )}
                    onClick={() => onSelectAccount?.(account.id)}>
                    <span className="truncate">{optionLabel}</span>
                    {/* Selection is a text marker, never a pill or a coloured dot
                        (console-ui skill "States": status is text). */}
                    {active ? (
                      <span aria-hidden="true" className={OVERLAY_MARKER_CLASS}>
                        active
                      </span>
                    ) : null}
                  </Menu.Item>
                );
              })}
              {onCopyId ? (
                <>
                  <Menu.Separator className={OVERLAY_SEPARATOR_CLASS} />
                  <Menu.Item className={OVERLAY_ITEM_CLASS} onClick={() => onCopyId(accountId)}>
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
      <span title={accountId || undefined} className={cn(rowOnlyClass, className)}>
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
      className={cn(chipClass, className)}>
      {content}
    </button>
  );
}
