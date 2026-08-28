import React from 'react';

import { cn } from '../../cn';
import type { SettingsRowProps, SettingsSectionProps } from './types';

// Gap-list item (LCI design pass, `docs/design/lci-app/PRIMITIVES.md`): a grouped settings
// section — an uppercase label above label/description/control rows. LCI's own version wraps
// this in a daisy `card`-shaped border+bg-base-200 box; that's exactly the "centre content is
// never carded" pattern `console-redesign/PRIMITIVES.md` already rejects. This renders
// uncontained on the floor instead, the same way `LedgerTable` does — a `raised` hairline
// between rows, no border, no background fill. Panelling (if a screen wants one) is the
// consumer's decision, not this component's.
export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <h2 className="text-subtle px-1 font-mono text-[10px] tracking-[.09em] uppercase">{title}</h2>
      <div className="divide-raised border-raised divide-y border-t">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, description, control, badge, children }: SettingsRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1 py-3">
      <div className="min-w-0">
        <div className="text-soft font-mono text-sm">{label}</div>
        {description ? (
          <div className="text-subtle mt-0.5 font-sans text-xs leading-[1.45]">{description}</div>
        ) : null}
      </div>
      <div className="text-subtle flex shrink-0 items-center gap-2.5 font-mono text-sm">
        {badge}
        {control ?? children}
      </div>
    </div>
  );
}
