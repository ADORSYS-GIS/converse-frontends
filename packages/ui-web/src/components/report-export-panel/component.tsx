import { Field as BaseField } from '@base-ui/react/field';
import { Switch } from '@base-ui/react/switch';
import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import { SegmentedControl } from '../segmented-control';
import type { ReportExportPanelProps } from './types';

// Contract: task assignment (forms & actions batch) — right-rail CONTENT (not self-panelled)
// for the Manage screen (manage-projects.svg): period · scope slot · group-by segmented ·
// include toggles · CSV|PDF segmented · one Generate report primary · LAST EXPORTS list.
//
// ADR 0010 Decision 4 (Base UI Switch + daisy `toggle`): replaces the hand-rolled `sr-only`
// checkbox + drawn box/check-mark pair. daisy's `.toggle` CSS already matches `[aria-checked]`
// (not only `:checked`), which is exactly the attribute Base UI's `Switch.Root` (`role="switch"`)
// sets — no extra styling glue needed. `--depth: 0`/`--radius-selector: 2px` (ADR 0008, both
// theme blocks) mean the stock knob renders flat with a 2px corner, not a shadowed pill, so the
// class needs no override. `Field.Root` + `Field.Label` (not a plain `<label>`) wires the
// click-to-toggle + `aria-labelledby` association — a bare `<label>` wrapping a non-native
// `role="switch"` element does not get that for free the way it did for the old native checkbox.
export function ReportExportPanel({
  period,
  onPeriodChange,
  scopeSlot,
  groupByOptions,
  groupBy,
  onGroupByChange,
  includeToggles,
  onToggleInclude,
  format,
  onFormatChange,
  onGenerate,
  generating = false,
  lastExports,
  className,
}: ReportExportPanelProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <Field
        label="Period"
        type="month"
        value={period}
        onChange={(event) => onPeriodChange(event.target.value)}
      />

      {scopeSlot}

      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClassName}>Group by</span>
        <SegmentedControl aria-label="Group by" options={groupByOptions} value={groupBy} onChange={onGroupByChange} />
      </div>

      <div className="flex flex-col gap-2">
        {includeToggles.map((toggle) => (
          <BaseField.Root key={toggle.id} className="flex items-center gap-2">
            <Switch.Root
              checked={toggle.checked}
              onCheckedChange={(checked) => onToggleInclude(toggle.id, checked)}
              className="toggle"
            />
            <BaseField.Label className="cursor-pointer font-mono text-xs text-soft">
              {toggle.label}
            </BaseField.Label>
          </BaseField.Root>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClassName}>Format</span>
        <SegmentedControl
          aria-label="Export format"
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'pdf', label: 'PDF' },
          ]}
          value={format}
          onChange={onFormatChange}
        />
      </div>

      <Button
        type="button"
        variant="primary"
        className="w-full"
        disabled={generating}
        onClick={() => onGenerate({ period, groupBy, format, includes: includeToggles.filter((t) => t.checked).map((t) => t.id) })}
      >
        {generating ? 'Generating…' : 'Generate report'}
      </Button>

      <div className="flex flex-col gap-3">
        <span className={fieldLabelClassName}>Last exports</span>
        {lastExports.length === 0 ? (
          <p className="font-mono text-[11px] text-subtle">No exports yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lastExports.map((entry) => (
              <li key={`${entry.filename}-${entry.date}`} className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs text-soft">{entry.filename}</span>
                <span className="font-mono text-[11px] text-subtle">{entry.date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
