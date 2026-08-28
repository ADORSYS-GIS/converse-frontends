import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import { SegmentedControl } from '../segmented-control';
import { Toggle } from '../toggle';
import type { ReportExportPanelProps } from './types';

// Contract: task assignment (forms & actions batch) — right-rail CONTENT (not self-panelled)
// for the Manage screen (manage-projects.svg): period · scope slot · group-by segmented ·
// include toggles · CSV|PDF segmented · one Generate report primary · LAST EXPORTS list.
//
// ADR 0010 Decision 4 (Base UI Switch + daisy `toggle`): replaces the hand-rolled `sr-only`
// checkbox + drawn box/check-mark pair. The include-toggles below render through the standalone
// `Toggle` primitive (extracted from this panel — LCI design pass, `PRIMITIVES.md`'s `toggle.tsx`
// row) rather than the inline `Field.Root`/`Switch.Root` pair this file used to hand-write, so a
// second consumer doesn't reimplement the same click-to-toggle/`aria-labelledby` wiring.
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
        <SegmentedControl
          aria-label="Group by"
          options={groupByOptions}
          value={groupBy}
          onChange={onGroupByChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        {includeToggles.map((toggle) => (
          <Toggle
            key={toggle.id}
            checked={toggle.checked}
            onCheckedChange={(checked) => onToggleInclude(toggle.id, checked)}
            label={toggle.label}
          />
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
        onClick={() =>
          onGenerate({
            period,
            groupBy,
            format,
            includes: includeToggles.filter((t) => t.checked).map((t) => t.id),
          })
        }>
        {generating ? 'Generating…' : 'Generate report'}
      </Button>

      <div className="flex flex-col gap-3">
        <span className={fieldLabelClassName}>Last exports</span>
        {lastExports.length === 0 ? (
          <p className="text-subtle font-mono text-[11px]">No exports yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lastExports.map((entry) => (
              <li
                key={`${entry.filename}-${entry.date}`}
                className="flex items-baseline justify-between gap-3">
                <span className="text-soft font-mono text-xs">{entry.filename}</span>
                <span className="text-subtle font-mono text-[11px]">{entry.date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
