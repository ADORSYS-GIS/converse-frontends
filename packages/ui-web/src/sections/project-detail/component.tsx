import React from 'react';

import { cn } from '../../cn';
import { DETAIL_LIST_CLASS, DETAIL_ROW_CLASS } from '../../lib/detail-row';
import { formatUsd } from '../../lib/money';
import { BODY_CLASS, LABEL_CLASS } from '../../lib/type-roles';
import type { ProjectDetailProps } from './types';

function money(value: number | null): string {
  return value === null ? '—' : formatUsd(value);
}

// Shell revamp phase 3 (right rail out) — the un-railed content of the deleted
// `ManageSelectionRail`: `DetailSheet`'s `title`/`subtitle` now carry the project's name and
// account (`projects-centre.tsx` passes them straight from the same `ProjectRow`), so this renders
// only the two facts that were not already chrome — the same `lib/detail-row.ts` definition-list
// geometry `ProjectSettings` uses for the identical "term on the left, value on the right" shape.
export function ProjectDetail({ project, className }: ProjectDetailProps) {
  const rows = [
    { term: 'Spend MTD', value: money(project.spendMtd) },
    { term: 'Quota tier', value: project.quotaTier ?? '—' },
  ];

  return (
    <dl className={cn(DETAIL_LIST_CLASS, className)}>
      {rows.map(({ term, value }) => (
        <div key={term} className={DETAIL_ROW_CLASS}>
          <dt className={LABEL_CLASS}>{term}</dt>
          <dd className={BODY_CLASS}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
