import { Popover } from '@base-ui/react/popover';
import React from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '../../cn';
import { fieldControlClassName, fieldLabelClassName } from '../field/field-classes';
import { OVERLAY_CLASS, OVERLAY_ITEM_CLASS, OVERLAY_POSITIONER_CLASS } from '../../lib/overlay';
import { LABEL_CLASS } from '../../lib/type-roles';
import { Chevron } from '../chevron';
import type { DateRangeFieldProps, DateRangeValue } from './types';

const UTC_DAY = 86_400_000;

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** `12 Aug – 28 Aug`, or a single day when from and to coincide. The console reports UTC. */
export function formatDateRange({ from, to }: DateRangeValue): string {
  const start = dayFormat.format(from);
  const end = dayFormat.format(to);
  return start === end ? start : `${start} – ${end}`;
}

export function presetRange(days: number, today: Date): DateRangeValue {
  return { from: new Date(today.getTime() - (days - 1) * UTC_DAY), to: today };
}

// daisyUI 5.7 ships first-class theming for react-day-picker: a full calendar block written
// against daisy's own variables, so it already resolves the 2px field radius, no depth and no
// noise from our theme blocks. Adding the class to the DayPicker root is what activates it — the
// class is NOT one of react-day-picker's own defaults (its root class is `rdp-root`), and daisy's
// every rule is descendant-scoped under it.
//
// That deleted the hand-maintained map that used to re-declare the whole calendar — the single
// largest re-declared CSS surface in the package (PRIMITIVE-MATRIX row 22) — and the four
// corrections that survived it have now moved to `theme.css` as plain CSS, which is where they
// always belonged: they are statements about daisy's paint, not about this component's props.
//
// Two entries stay in the map, and only because CSS is the wrong tool for either:
//  • the weekday header is the `label` type role, and that role has exactly one definition, in
//    type-roles.ts — spelling `11px`/`subtle` again in a stylesheet would be a second one;
//  • today's cell drops daisy's own part class rather than overriding it. daisy fills that cell
//    with a solid signal block — orange as decoration, which the console never does — and its rule
//    targets the nested day BUTTON, so overriding it in CSS at a weight that also beats
//    `.rdp-selected .rdp-day_button` would force the signal colour onto a selected endpoint's
//    dark-on-light fill too. Dropping the class makes daisy's rule simply never match, and
//    text-primary on the cell reaches the button through daisy's own `color: inherit`.
//
// One deliberate visual change came with the adoption, and nothing had to be written for it: the
// selected range's two endpoints used to be a signal fill and are now daisy's base-content fill
// with base-100 text (13:1 in dark, 8:1 in light — both well past AA). A chosen date is neither
// actionable nor a breach, so it is not what the one orange signal is for; the accent now appears
// in this calendar only on the trigger's focus border and on today's numeral.
const RDP_DEFAULTS = getDefaultClassNames();

const dayPickerClassNames = {
  weekday: cn(RDP_DEFAULTS.weekday, LABEL_CLASS),
  today: 'text-primary',
} as const;

export function DateRangeField({
  label,
  preset,
  presets,
  value,
  onPresetChange,
  onRangeChange,
  today = new Date(),
  layout = 'stacked',
  hideLabel,
  className,
}: DateRangeFieldProps) {
  const inline = layout === 'inline';
  const activePreset = presets.find((option) => option.value === preset);
  const triggerText = activePreset ? activePreset.label : formatDateRange(value);

  return (
    <Popover.Root>
      {/* daisy's two field layouts, the same pair `Field` and `SelectField` name. The trigger
          wears the shared control class, so a range picker reads as a field without this
          component describing one. */}
      <div className={cn(inline ? 'label' : 'fieldset', className)}>
        <span className={hideLabel ? 'sr-only' : fieldLabelClassName}>{label}</span>
        <Popover.Trigger aria-label={label} className={fieldControlClassName}>
          {triggerText}
          <Chevron />
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className={OVERLAY_POSITIONER_CLASS}>
          {/* Base UI's Popover popup is a `role="dialog"`, and an unnamed dialog is an axe
              violation (pre-existing, surfaced while auditing the daisy adoption). The field's
              own label names it, the way the trigger is named. */}
          <Popover.Popup aria-label={label} className={cn('date-range-popup', OVERLAY_CLASS)}>
            <div className="date-range-presets">
              {presets.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPresetChange(option.value)}
                  // The same row an option in a Select popup gets — these ARE options, in an
                  // overlay, and the console has one treatment for that, including for the
                  // current one: `data-selected` is the attribute OVERLAY_ITEM_CLASS already
                  // paints, so the fill is not re-stated here. Its else-branch hover belongs to
                  // the column and is stated there.
                  data-selected={option.value === preset ? 'true' : undefined}
                  className={OVERLAY_ITEM_CLASS}>
                  {option.label}
                </button>
              ))}
              <span className={LABEL_CLASS}>{preset ? 'Or pick a span' : 'Custom'}</span>
            </div>

            <DayPicker
              // Activates daisy's calendar block — see the note above the class map.
              className="react-day-picker"
              mode="range"
              required
              // Two months: a 30-day preset almost always straddles a month boundary, and a
              // single-month calendar hides one end of the very range it is showing.
              numberOfMonths={2}
              timeZone="UTC"
              weekStartsOn={1}
              selected={{ from: value.from, to: value.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) onRangeChange({ from: range.from, to: range.to });
              }}
              disabled={{ after: today }}
              defaultMonth={value.from}
              classNames={dayPickerClassNames}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
