import React, { useId } from 'react';

import { cn } from '../../cn';
import { BODY_CLASS, DATA_CLASS, META_CLASS, ROW_LABEL_CLASS } from '../../lib/type-roles';
import type { SettingsRowProps } from './types';

// The classical list-style settings row (phase 9, owner: "The settings pages do NOT look like a
// settings page. Why not do the classical list-like setting page?" — macOS/Stripe/Linear
// pattern). `settings-list`/`settings-row` (theme.css) own the geometry — a card containing a
// stack of these, parted by `--color-raised` hairlines; this component only says what goes in
// one row: label (+ optional description) on the left, value (+ action) on the right.
//
// NO UPSTREAM: a labelled row with a trailing value and action is a layout, not a control — Base
// UI has nothing to delegate to here, the same shape `Card`/`pagination` are already `null` for
// in `scripts/base-ui-adoption.ts`.
export function SettingsRow({
  label,
  description,
  value,
  valueKind = 'text',
  valueMuted,
  action,
  current,
  onClick,
  className,
}: SettingsRowProps) {
  // Only meaningful when the row is a `<button>`: the description becomes the accessible
  // DESCRIPTION (`aria-describedby`) rather than folding into the NAME. Left unassociated, the
  // browser's default name computation concatenates every visible text node with no separator —
  // "batch-evalactive · Not assigned" — which is both an unreadable name for a screen-reader user
  // and, in practice, un-selectable by an exact-text query (found via a Storybook play-function
  // test, `settings.stories.tsx`'s `RenameProjectFlow`).
  const descriptionId = useId();

  const content = (
    <>
      <div className="settings-row-main">
        <span className={ROW_LABEL_CLASS}>{label}</span>
        {description ? (
          <span id={onClick ? descriptionId : undefined} className={META_CLASS}>
            {description}
          </span>
        ) : null}
      </div>
      <div className="settings-row-value">
        {value !== undefined ? (
          <span
            className={cn(
              valueKind === 'data' ? DATA_CLASS : BODY_CLASS,
              valueMuted && 'text-subtle'
            )}>
            {value}
          </span>
        ) : null}
        {action}
      </div>
    </>
  );

  const dataCurrent = current ? 'true' : undefined;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-describedby={description ? descriptionId : undefined}
        data-current={dataCurrent}
        className={cn('settings-row', className)}>
        {content}
      </button>
    );
  }

  return (
    <div data-current={dataCurrent} className={cn('settings-row', className)}>
      {content}
    </div>
  );
}
