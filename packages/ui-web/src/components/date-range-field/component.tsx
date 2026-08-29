import { Popover } from '@base-ui/react/popover';
import React from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '../../cn';
import { fieldLabelClassName } from '../field/field-classes';
import { OVERLAY_CLASS } from '../../lib/overlay';
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

// daisyUI 5.7.22 ships first-class theming for react-day-picker — `components/calendar.css`
// carries a full `.react-day-picker` / `.rdp-*` block written against daisy's own variables, so
// it already resolves `--radius-field: 0.125rem`, `--depth: 0` and `--noise: 0` from our theme
// blocks. Adding the `react-day-picker` class to the root is what activates it: the class is NOT
// one of react-day-picker's own defaults (its root class is `rdp-root`), and daisy's every rule
// is descendant-scoped under it.
//
// That deletes the hand-maintained `classNames` map that used to re-declare the whole calendar —
// the single largest re-declared CSS surface in the package (PRIMITIVE-MATRIX row 22). What
// survives below are only the parts where daisy's default paint contradicts a console rule; each
// carries the reason. `getDefaultClassNames()` is spread in per key because react-day-picker
// REPLACES a part's class rather than merging, so dropping the `rdp-*` class would take daisy's
// geometry with it. Tailwind utilities win over daisy's own declarations regardless of
// specificity: daisy nests its calendar rules in `@layer utilities { @layer daisyui.l1.l2.l3 }`,
// and Tailwind's utilities sit unlayered inside `utilities`, which outranks any nested sub-layer.
//
// One deliberate visual change comes with the adoption, and it is NOT listed below because
// nothing had to be written for it: the selected range's two endpoints used to be a `primary`
// fill and are now daisy's `base-content` fill with `base-100` text (13:1 in dark, 8:1 in light —
// both well past AA). A chosen date is neither actionable nor a breach, so it is not what the one
// orange signal is for; the accent now appears in this calendar only on the trigger's focus
// border and on today's numeral.
const RDP_DEFAULTS = getDefaultClassNames();

const dayPickerClassNames = {
  // daisy paints the calendar as its own card — `background-color: base-100` (the FLOOR, #000 in
  // dark) plus a `base-200` frame. It already sits inside the popover popup, which IS the panel;
  // left alone this drops a floor-coloured rectangle and a second, wrong-toned border inside it.
  root: cn(RDP_DEFAULTS.root, 'border-0 bg-transparent'),

  // daisy gaps the two months by 2rem. 16 is on our spacing scale, and it keeps the two-month
  // calendar plus the presets column inside a popover width a narrow viewport can still take.
  months: cn(RDP_DEFAULTS.months, 'gap-4'),

  // The weekday header is the `label` type role, which has exactly one definition. daisy's own
  // treatment (`opacity: .6`, `font-size: smaller`, weight 500) is a different role.
  weekday: cn(RDP_DEFAULTS.weekday, LABEL_CLASS, 'font-normal opacity-100'),

  // The month name is a heading, so it is `ink`; daisy leaves it at the inherited body colour.
  caption_label: cn(RDP_DEFAULTS.caption_label, 'text-ink'),

  // daisy fills today's cell with a solid `primary` block — orange as decoration, which the
  // console never does: today is a fact about the calendar, not something actionable, so the
  // numeral carries it instead. This is the one part that drops daisy's `rdp-today` class
  // outright rather than adding to it, because daisy's rule targets the nested day BUTTON
  // (`.rdp-today:not(.rdp-outside) .rdp-day_button`) and un-setting it from the cell would need a
  // `[&_.rdp-day_button]:` arbitrary variant — whose literal underscore Tailwind would rewrite to
  // a descendant combinator. Without `rdp-today` the rule simply never matches, and `text-primary`
  // on the cell reaches the button through daisy's own `.rdp-day_button { color: inherit }`.
  today: 'text-primary',

  // daisy tints the span between the two endpoints with `base-200` — which is exactly the popup's
  // own fill, so the selected span would be invisible. `raised` is the token defined as the step
  // toward greater contrast against the panel it marks, and it measures that way: against a
  // `surface` popup it separates 1.079:1 in dark and 1.345:1 in light, where `chrome` — the other
  // candidate — matches it in dark (1.074) but nearly vanishes in light (1.09).
  range_middle: cn(RDP_DEFAULTS.range_middle, 'bg-raised'),
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
  className,
}: DateRangeFieldProps) {
  const inline = layout === 'inline';
  const activePreset = presets.find((option) => option.value === preset);
  const triggerText = activePreset ? activePreset.label : formatDateRange(value);

  return (
    <Popover.Root>
      <div className={cn(inline ? 'flex items-center gap-2' : 'flex flex-col gap-1.5', className)}>
        <span className={cn(fieldLabelClassName, inline && 'shrink-0')}>{label}</span>
        <Popover.Trigger
          aria-label={label}
          className={cn(
            'border-border bg-chrome flex h-[30px] items-center justify-between gap-2 rounded-[2px] border px-3',
            'text-soft data-[popup-open]:border-primary focus-visible:border-primary font-mono text-sm outline-hidden',
            inline ? 'w-auto' : 'w-full'
          )}>
          {triggerText}
          <Chevron />
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="z-50 outline-hidden">
          {/* Base UI's Popover popup is a `role="dialog"`, and an unnamed dialog is an axe
              `aria-dialog-name` violation (pre-existing, surfaced while auditing the daisy
              adoption). The field's own label names it, the way the trigger is named. */}
          <Popover.Popup aria-label={label} className={cn('flex gap-4 p-3', OVERLAY_CLASS)}>
            <div className="border-raised flex w-[132px] flex-col gap-1 border-r pr-3">
              {presets.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPresetChange(option.value)}
                  className={cn(
                    'rounded-[2px] px-2 py-1.5 text-left font-mono text-xs outline-hidden',
                    option.value === preset ? 'bg-raised text-ink' : 'text-soft hover:bg-chrome'
                  )}>
                  {option.label}
                </button>
              ))}
              <span className={cn(LABEL_CLASS, 'mt-2 px-2')}>
                {preset ? 'Or pick a span' : 'Custom'}
              </span>
            </div>

            <DayPicker
              // Activates daisy's `.react-day-picker` block — see the note above `RDP_DEFAULTS`.
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
