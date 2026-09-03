import { Collapsible } from '@base-ui/react/collapsible';
import React from 'react';

import { cn } from '../../cn';
import { Chevron } from '../../components/chevron';
import { BODY_CLASS, META_CLASS, ROW_LABEL_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import type { RefillPolicyManualProps } from './types';

/**
 * "How refill policies work" — the in-page explainer the owner asked for verbatim ("How does it
 * work? Where's the manual?") after finding the old `/settings/refill-options` unreadable. A
 * `Collapsible` (Base UI owns the disclosure behaviour, ADR 0010 Decision 2), not a permanently
 * open block — the manual is reference material a returning author skips past, not a wall of
 * prose between the page header and the form every visit.
 *
 * The lifecycle diagram is plain DOM, not a chart: four stage labels and the connective tissue
 * between them, in the token palette, using the existing `Chevron` glyph as the connector — no
 * chart-core, no `<svg>` scale, nothing this component owns that isn't already shared.
 */
const STAGES: Array<{ name: string; caption: string }> = [
  { name: 'Author', caption: 'Draft a rule set. Validated on write, not yet live.' },
  { name: 'Activate', caption: 'Swap it in atomically — the old revision stays on record.' },
  {
    name: 'Evaluate',
    caption: 'Every refill request is checked against the revision that is active now.',
  },
  {
    name: 'Approve / Queue',
    caption: 'Granted instantly, or sent to the refills queue for a human.',
  },
];

export function RefillPolicyManual({ open, onOpenChange, className }: RefillPolicyManualProps) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange} className={className}>
      <Collapsible.Trigger className="zone-heading w-full">
        <span className={SECTION_TITLE_CLASS}>How refill policies work</span>
        <Chevron direction={open ? 'down' : 'right'} />
      </Collapsible.Trigger>

      <Collapsible.Panel className="mt-3 flex flex-col gap-4">
        <p className={BODY_CLASS}>
          A refill policy is versioned rule data, not a single live setting. Authoring a new
          revision (below) never changes what is active — it only adds a candidate, validated the
          moment it is written but inert until someone separately activates it. Activating swaps the
          whole rule set in one atomic step; the previous revision stays on record, so a bad
          activation can be rolled back to a known-good revision id rather than re-typed from
          memory.
        </p>
        <p className={BODY_CLASS}>
          Every refill request an account makes is evaluated against whichever revision is currently
          active — never the one most recently authored, and never one still in draft. The engine
          walks the active rule set&rsquo;s rules in order and stops at the first one whose
          conditions match; nothing that matches falls through to that revision&rsquo;s own default
          effect.
        </p>
        <p className={BODY_CLASS}>
          &ldquo;Auto-approve&rdquo; means the request is granted immediately, no human involved, up
          to whatever the matching rule allows — capped, if the rule caps it. Anything the rules
          route to &ldquo;manual review&rdquo; instead lands in the refill queue, where an operator
          sees the requested amount, the account&rsquo;s consumption, and the policy&rsquo;s own
          reason code, and approves or declines it by hand. &ldquo;Deny&rdquo; and &ldquo;no
          action&rdquo; both refuse the request outright.
        </p>

        <div
          role="group"
          aria-label="Refill policy lifecycle"
          className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
          {STAGES.map((stage, index) => (
            <React.Fragment key={stage.name}>
              <div className="flex flex-1 flex-col gap-1">
                <div className={ROW_LABEL_CLASS}>{stage.name}</div>
                <p className={META_CLASS}>{stage.caption}</p>
              </div>
              {index < STAGES.length - 1 ? (
                <Chevron direction="right" className="mt-1 hidden shrink-0 sm:block" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
