import { LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import type { ReactNode } from 'react';

/** One label/value pair in a `<dl>` fact grid — shared between the repository and run-detail
 *  Overview cards so both read as the same kind of thing. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={LABEL_CLASS}>{label}</dt>
      <dd className="text-soft text-sm">{children}</dd>
    </div>
  );
}
