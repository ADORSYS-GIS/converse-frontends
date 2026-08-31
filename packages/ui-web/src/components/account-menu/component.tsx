import { Menu } from '@base-ui/react/menu';
import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { Chevron } from '../chevron';
import type { AccountMenuProps } from './types';
import { RAIL_ICON_COLUMN_CLASS } from '../../lib/rail-grid';
import { LABEL_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import {
  OVERLAY_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_POSITIONER_CLASS,
  OVERLAY_SECTION_CLASS,
  OVERLAY_SEPARATOR_CLASS,
} from '../../lib/overlay';

// Contract: shell revamp phase 2 (2026-08-30) — the sidebar footer / top bar "account menu" +
// console-ui skill (ADR 0010 Decision 2: Base UI owns behaviour — Menu here, never a hand-written
// focus trap or roving tabindex). The avatar and email identity block already in the header IS
// the trigger, so nothing about the header's visual footprint changes when this menu closes.
//
// Paint, after the daisy pass:
//
//  * The trigger is the library's own Button at variant ghost — it was re-deriving btn's radius,
//    mono face and focus ring by hand. Composition over re-implementation; the only thing left
//    for this component to say is that its two children sit 12px apart.
//  * The popup list is daisy menu at menu-sm, rendered as a real ul so the class lands on the
//    element it is written for. Base UI's own role="menu" stays on that ul and each row is a
//    role="none" li wrapping the menuitem, which is the standard menu tree — an li carrying its
//    implicit listitem role inside role="menu" would fail aria-required-children.
//  * Two daisy behaviours are suppressed because they contradict ADR 0008, both verified in the
//    compiled stylesheet rather than assumed: `.menu li > *:hover` paints a 1%-alpha inset box
//    shadow (no shadows, ever) and fills any li child on hover including the non-interactive
//    identity block (a hover state on something you cannot press). OVERLAY_ITEM_CLASS carries the
//    shadow-none and OVERLAY_SECTION_CLASS the transparent hover; Tailwind utilities are
//    unlayered inside `utilities` while daisy emits into a sublayer of it, so both win without
//    an !important.
//  * Separation from the identity line to Sign out stays a raised hairline, per the skill's
//    panel-separation rule — never a border, never a shadow. daisy's own idiom for that (an
//    empty li) paints base-content/10 instead, so OVERLAY_SEPARATOR_CLASS still wins.
export function AccountMenu({
  name,
  email,
  initials,
  onSignOut,
  triggerLabel,
  className,
  variant = 'inline',
  popupClassName,
}: AccountMenuProps) {
  const label = name ?? email;
  const sidebar = variant === 'sidebar';

  return (
    <Menu.Root>
      <Menu.Trigger
        // `sidebar`: a plain full-width row, not `Button` — `Button`'s own `btn` sizing/focus
        // ring would fight `sidebar-footer-row`'s 36px/hover contract instead of composing with
        // it, the same reason `AccountBadge`'s `sidebar` variant renders its own row rather than
        // wearing `Button`.
        render={sidebar ? <button type="button" /> : <Button variant="ghost" size="sm" />}
        className={cn(sidebar ? 'sidebar-footer-row' : 'gap-3', className)}
        aria-label={triggerLabel ?? (label ? `Account menu — ${label}` : 'Account menu')}>
        {sidebar ? (
          <>
            {/* Icon column + `avatar-chip-sm` (Addition 5, owner screenshot: the identity chip
                sat at a third x, matching neither the Search row's icon nor the Theme row's own
                toggle) — the SAME 16px column every nav row's glyph sits in, so the label below
                starts at the one shared rail label x the whole sidebar shares. */}
            <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
              <span aria-hidden="true" className="avatar-chip-sm">
                {initials}
              </span>
            </span>
            {/* Name, falling back to email — the SAME `label` this component already computes
                for its `aria-label` above, not email alone. The identity row used to render a
                bare initials chip with no text at all (owner review); `rail-row-label` is the
                same truncating flex-1 treatment every other sidebar row label already uses. */}
            {label ? <span className="rail-row-label text-soft text-[13px]">{label}</span> : null}
            {/* Trailing chevron, DOWN — the same "this row opens a menu below it" mark
                `AccountBadge`'s workspace switcher already carries, not the `direction="right"`
                "opens a detail sheet" mark `SettingsRow` uses: this row opens a popup, not a
                navigation. */}
            <Chevron />
          </>
        ) : (
          <>
            {email ? <span className={cn(LABEL_CLASS, 'hidden md:inline')}>{email}</span> : null}
            <span aria-hidden="true" className="avatar-chip">
              {initials}
            </span>
          </>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className={OVERLAY_POSITIONER_CLASS}>
          <Menu.Popup
            render={<ul />}
            className={cn('menu menu-sm account-menu-popup', OVERLAY_CLASS, popupClassName)}>
            {name || email ? (
              <li role="none">
                <div role="presentation" className={OVERLAY_SECTION_CLASS}>
                  {name ? (
                    <span className={cn(SECTION_TITLE_CLASS, 'truncate')} title={name}>
                      {name}
                    </span>
                  ) : null}
                  {email ? (
                    <span className={cn(LABEL_CLASS, 'truncate')} title={email}>
                      {email}
                    </span>
                  ) : null}
                </div>
              </li>
            ) : null}

            {/* Theme section REMOVED (owner finding, 2026-08-31: "I don't see the usage, for
                the theme to be hidden behind the account dropdown. Please put it outside") — it
                now lives as its own visible `ThemeToggle` icon button beside this menu's trigger
                (the header's right cluster / the sidebar footer's own Theme row), not inside the
                popup a click has to discover first. `AccountMenu` takes no `theme`/
                `onThemeChange` props any more. */}

            <Menu.Separator render={<li />} className={OVERLAY_SEPARATOR_CLASS} />

            <li role="none">
              {/* `account-menu-row` (theme.css): the palette-matching 36px row rhythm (owner ask,
                  2026-08-31 — "same overlay language as the palette: ... row height"), scoped to
                  THIS popup's own row rather than the shared `OVERLAY_ITEM_CLASS` every other
                  Menu/Select/Combobox popup in the console also renders through. */}
              <Menu.Item
                className={cn(OVERLAY_ITEM_CLASS, 'account-menu-row')}
                onClick={onSignOut}>
                Sign out
              </Menu.Item>
            </li>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
