import { Field as BaseField } from '@base-ui/react/field';
import { Switch } from '@base-ui/react/switch';
import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { Field } from '../field';
import { fieldLabelClassName } from '../field/field-classes';
import { InlineStatus } from '../inline-status';
import { SegmentedControl } from '../segmented-control';
import type { ReportExportPanelProps } from './types';

// Contract: task assignment (forms & actions batch) — right-rail CONTENT (not self-panelled)
// for the Manage screen (manage-projects.svg): period · scope slot · group-by segmented ·
// include toggles · CSV|PDF segmented · one Generate report primary.
//
// Ticket #309: the LAST EXPORTS list that used to render below the primary is gone, not just
// emptied. It was never a real list — the manage screen hook fed it a hardcoded empty array because
// no export had ever been attempted (console-ui#326's "Export history is unwired." fix), but now
// that Generate report calls the real consumption-report route (#308), keeping a permanently-empty
// "history" section would misrepresent a genuinely-succeeding action as one that still has nothing
// to show. There is no backend surface that records past exports (no such table or procedure in
// the authz schema), so per the ticket's own Risk section the safer default is removing the
// section outright rather than half-implementing it — recorded here as the decision, not left as
// a TODO.
//
// ADR 0010 Decision 4 (Base UI Switch + daisy `toggle`): replaces the hand-rolled visually-hidden
// checkbox plus drawn box/check-mark pair. daisy's toggle CSS already matches `[aria-checked]`
// (not only `:checked`), which is exactly the attribute Base UI's `Switch.Root` sets — no extra
// styling glue needed. Both theme blocks pin no depth and a 2px selector radius, so the stock knob
// renders flat with a square corner rather than a shadowed pill.
//
// Every wrapper here is now a daisy layout class: `fieldset` for a label stacked over its control,
// `label` for a switch beside its text (which is also where the row's pointer cursor and the label
// association come from — a bare native label wrapping a non-native `role="switch"` element gets
// neither for free). `btn-block` is daisy's own full-width button.
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
  notice,
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

      <div className="fieldset">
        <span className={fieldLabelClassName}>Group by</span>
        <SegmentedControl
          aria-label="Group by"
          options={groupByOptions}
          value={groupBy}
          onChange={onGroupByChange}
        />
      </div>

      <div className="fieldset">
        {includeToggles.map((toggle) => (
          <BaseField.Root key={toggle.id} className="label">
            <Switch.Root
              checked={toggle.checked}
              onCheckedChange={(checked) => onToggleInclude(toggle.id, checked)}
              className="toggle"
            />
            <BaseField.Label>{toggle.label}</BaseField.Label>
          </BaseField.Root>
        ))}
      </div>

      <div className="fieldset">
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
        className="btn-block"
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

      {notice ? (
        <InlineStatus
          action={
            notice.onDismiss ? (
              <Button type="button" variant="ghost" size="sm" onClick={notice.onDismiss}>
                Dismiss
              </Button>
            ) : undefined
          }>
          {notice.message}
        </InlineStatus>
      ) : null}
    </div>
  );
}
