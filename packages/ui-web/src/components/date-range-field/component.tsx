import { Popover } from '@base-ui/react/popover';
import React from 'react';
import { DayPicker } from 'react-day-picker';

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

// react-day-picker ships its own stylesheet; we import none of it and drive every part through
// `classNames` with our tokens instead, so the calendar cannot introduce a second visual language.
const dayPickerClassNames = {
  root: 'font-mono text-xs text-soft',
  months: 'flex gap-4',
  month_caption: 'flex items-center justify-center h-8 text-ink',
  caption_label: 'text-xs',
  nav: 'absolute right-0 top-0 flex gap-1',
  button_previous: 'flex size-6 items-center justify-center rounded-[2px] hover:bg-raised',
  button_next: 'flex size-6 items-center justify-center rounded-[2px] hover:bg-raised',
  chevron: 'size-3 fill-subtle',
  weekdays: 'flex',
  weekday: cn('flex size-8 items-center justify-center', LABEL_CLASS),
  week: 'flex',
  day: 'size-8 p-0',
  day_button:
    'size-8 rounded-[2px] hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40',
  selected: 'bg-raised text-ink',
  range_start: 'bg-primary text-primary-content rounded-l-[2px]',
  range_end: 'bg-primary text-primary-content rounded-r-[2px]',
  range_middle: 'bg-chrome text-soft',
  today: 'text-primary',
  outside: 'text-subtle opacity-50',
  disabled: 'text-subtle opacity-40',
  hidden: 'invisible',
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
          <Popover.Popup className={cn('flex gap-4 p-3', OVERLAY_CLASS)}>
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
