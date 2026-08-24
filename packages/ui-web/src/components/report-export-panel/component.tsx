import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { fieldLabelClassName } from '../field/cva';
import { Field } from '../field';
import { SegmentedControl } from '../segmented-control';
import type { ReportExportPanelProps } from './types';

// Contract: task assignment (forms & actions batch) — right-rail CONTENT (not self-panelled)
// for the Manage screen (manage-projects.svg): period · scope slot · group-by segmented ·
// include toggles · CSV|PDF segmented · one Generate report primary · LAST EXPORTS list.
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
          <label key={toggle.id} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={toggle.checked}
              onChange={(event) => onToggleInclude(toggle.id, event.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-[1px] border border-border',
                toggle.checked ? 'bg-raised' : 'bg-transparent',
              )}
            >
              {toggle.checked ? (
                <svg viewBox="0 0 8 8" className="h-[7px] w-[7px] stroke-ink" strokeWidth="1.4" fill="none">
                  <path d="M1 4l2 2 4-4" />
                </svg>
              ) : null}
            </span>
            <span className="font-mono text-xs text-soft">{toggle.label}</span>
          </label>
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
