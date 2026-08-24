import React, { useId } from 'react';

import { cn } from '../../cn';
import { fieldControlVariants, fieldLabelClassName } from '../field/cva';
import type { ScopeSelectProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — account → project cascade unit for
// rail panels. Two stacked labelled selects (native <select>, styled to the Field treatment).
// Changing the account resets the project. Pure controlled component.
export function ScopeSelect({
  accounts,
  projects,
  value,
  onChange,
  projectPlaceholder = 'All projects',
  className,
}: ScopeSelectProps) {
  const accountId = useId();
  const projectId = useId();
  const scopedProjects = projects.filter((project) => project.accountId === value.accountId);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={accountId} className={fieldLabelClassName}>
          Account
        </label>
        <select
          id={accountId}
          value={value.accountId}
          onChange={(event) => onChange({ accountId: event.target.value, projectId: null })}
          className={cn(fieldControlVariants({ error: false, multiline: false }), 'appearance-none')}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={projectId} className={fieldLabelClassName}>
          Project
        </label>
        <select
          id={projectId}
          value={value.projectId ?? ''}
          onChange={(event) => onChange({ accountId: value.accountId, projectId: event.target.value || null })}
          className={cn(fieldControlVariants({ error: false, multiline: false }), 'appearance-none')}
        >
          <option value="">{projectPlaceholder}</option>
          {scopedProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
