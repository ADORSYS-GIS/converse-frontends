import { Menu } from '@base-ui/react/menu';
import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import type { AccountMenuProps, AccountMenuTheme } from './types';
import { LABEL_CLASS, META_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import {
  OVERLAY_CLASS,
  OVERLAY_CURRENT_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_POSITIONER_CLASS,
  OVERLAY_SECTION_CLASS,
  OVERLAY_SEPARATOR_CLASS,
} from '../../lib/overlay';

const THEME_OPTIONS: { value: AccountMenuTheme; label: string }[] = [
  { value: 'black', label: 'Dark' },
  { value: 'wireframe', label: 'Light' },
  { value: 'system', label: 'System' },
];

// The three theme choices read as one row of words, not three menu rows: they are a single
// setting with three states, and stacking them would make a two-line menu into a five-line one.
// So they keep menuitem semantics (Base UI still owns arrow-key traversal) but not the full-row
// paint that OVERLAY_ITEM_CLASS gives the actions -- `theme-choice` (theme.css) is that
// narrower treatment.
const THEME_ITEM_CLASS = cn(META_CLASS, 'theme-choice');

// Contract: docs/design/console-redesign/README.md §4 ConsoleHeader "account menu" + the
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
  theme,
  onThemeChange,
}: AccountMenuProps) {
  const label = name ?? email;

  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant="ghost" size="sm" />}
        className={cn('gap-3', className)}
        aria-label={triggerLabel ?? (label ? `Account menu — ${label}` : 'Account menu')}>
        {email ? <span className={cn(LABEL_CLASS, 'hidden md:inline')}>{email}</span> : null}
        <span aria-hidden="true" className="avatar-chip">
          {initials}
        </span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className={OVERLAY_POSITIONER_CLASS}>
          <Menu.Popup
            render={<ul />}
            className={cn('menu menu-sm account-menu-popup', OVERLAY_CLASS)}>
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

            {theme && onThemeChange ? (
              <>
                <Menu.Separator render={<li />} className={OVERLAY_SEPARATOR_CLASS} />
                <li role="none">
                  <div role="presentation" className={OVERLAY_SECTION_CLASS}>
                    <span className={LABEL_CLASS}>Theme</span>
                    <div className="theme-choice-row">
                      {THEME_OPTIONS.map((option) => (
                        <Menu.Item
                          key={option.value}
                          className={cn(
                            THEME_ITEM_CLASS,
                            option.value === theme && OVERLAY_CURRENT_CLASS
                          )}
                          closeOnClick={false}
                          onClick={() => onThemeChange(option.value)}>
                          {option.value === theme ? `[${option.label}]` : option.label}
                        </Menu.Item>
                      ))}
                    </div>
                  </div>
                </li>
              </>
            ) : null}

            <Menu.Separator render={<li />} className={OVERLAY_SEPARATOR_CLASS} />

            <li role="none">
              <Menu.Item className={OVERLAY_ITEM_CLASS} onClick={onSignOut}>
                Sign out
              </Menu.Item>
            </li>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
