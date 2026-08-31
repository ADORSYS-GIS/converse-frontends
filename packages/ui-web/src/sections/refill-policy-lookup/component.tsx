import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { Field } from '../../components/field';
import { META_CLASS } from '../../lib/type-roles';
import { ZoneHeading } from '../../lib/zone-heading';
import { RefillPolicyStatusStrip } from '../refill-policy-status-strip';
import type { RefillPolicyLookupProps } from './types';

/**
 * `/admin/refill-policies`'s list-mode lookup zone — the honest answer to "which policy set do I
 * even look at": there is no procedure that lists which policy sets exist
 * (`converse-frontends#368`), so an admin who knows one supplies its id here, and
 * `RefillPolicyStatusStrip` renders whatever `getBudgetPolicyStatus` says about it. Once a lookup
 * comes back `ready`, `onEditRevision`/`onSimulate` open this same id's `?edit=`/`?simulate=`
 * mode — never rendered before that, since there is nothing yet to author a replacement for or
 * simulate against.
 */
export function RefillPolicyLookup({
  value,
  onChange,
  status,
  onEditRevision,
  onSimulate,
  className,
}: RefillPolicyLookupProps) {
  return (
    <div className={className}>
      <ZoneHeading label="Look up a policy set" />
      <p className={cn(META_CLASS, 'mt-2')}>
        Enter a policy set id to check its status — there is no procedure that lists which policy
        sets exist (converse-frontends#368).
      </p>

      <Field
        label="Policy set id"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        containerClassName="mt-4 max-w-xs"
      />

      <RefillPolicyStatusStrip state={status} className="mt-4" />

      {status.status === 'ready' && (onEditRevision || onSimulate) ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {onEditRevision ? (
            <Button type="button" variant="secondary" size="sm" onClick={onEditRevision}>
              Author a replacement revision
            </Button>
          ) : null}
          {onSimulate ? (
            <Button type="button" variant="secondary" size="sm" onClick={onSimulate}>
              Simulate against this policy
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
