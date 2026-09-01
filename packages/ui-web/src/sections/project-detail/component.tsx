import React from 'react';

import { cn } from '../../cn';
import { SettingsRow } from '../../components/settings-row';
import { formatUsd } from '../../lib/money';
import type { ProjectDetailProps } from './types';

function money(value: number | null): string {
  return value === null ? '—' : formatUsd(value);
}

// Rail-return round (2026-08-30, Addition E — owner screenshot: "a full-height void with 7 rows,
// values flung to the far edge"): the `lib/detail-row.ts` bare `dl`/`dt`/`dd` geometry this used
// to render is gone in favour of the same `settings-list`/`SettingsRow` idiom
// `AccountSettings`/`ProjectSettings` already use for the identical "label left, value right"
// shape — richer row padding, and (this component's own addition) a capped measure so the value
// sits near its label rather than at the far edge of a wide sheet/rail. The host chrome
// (`BottomSheet`'s `title`/`subtitle`/`headerAction` at rail-less tiers, or the rail's own header
// block) carries the project's name, status and `Rename` action now — this renders only the facts
// that are not already chrome, the same split the old `DetailSheet` version made.
export function ProjectDetail({ project, className }: ProjectDetailProps) {
  return (
    <div className={cn('max-w-[420px]', className)}>
      <div className="settings-list">
        <SettingsRow label="Spend MTD" value={money(project.spendMtd)} valueKind="data" />
        <SettingsRow label="Quota tier" value={project.quotaTier ?? '—'} valueKind="data" />
      </div>
    </div>
  );
}
