import React from 'react';

import { cn } from '../../cn';
import { SkeletonMetric } from '../../components/skeleton-metric';
import { Sparkline } from '../../components/sparkline';
import { StatCard } from '../../components/stat-card';
import type { OverviewStatRowProps } from './types';

// Skeleton matching a real `StatCard`'s geometry exactly (console-ui skill §states: "skeleton
// blocks (`raised`) matching final geometry" — no spinner, no shimmer). No icon block any more
// (phase 9, item 4 — "DELETE the corner glyphs: label + numeral only"): the label line is the
// card's only leading block now.
function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-[2px] p-4" role="presentation" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <span className="bg-raised h-[10px] w-24 rounded-[2px]" />
        <span className="bg-raised h-[20px] w-20 rounded-[2px]" />
      </div>
      <div className="mt-3">
        <SkeletonMetric width={72} />
      </div>
      <div className="bg-raised mt-2 h-[10px] w-28 rounded-[2px]" />
    </div>
  );
}

// Contract: docs/design/console-redesign/README.md §5.1 (overview.svg) — the stat row: a scalar
// gets a panel, so these are the screen's only self-panelled centre blocks.
//
// `lg:basis-[209px]` is the 1440-reference size (4 × 209 + 3 × 12px gaps = 872px, the spec's
// exact centre width at 1440 — README §3). `lg:flex-1 lg:min-w-0` (not `shrink-0`) lets the cards
// scale down together below that reference instead of forcing the page to overflow (console-ui
// skill "No overflow, ever" / "Fluid always").
export function OverviewStatRow({ cards, loading = false, className }: OverviewStatRowProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2 lg:flex', className)}>
      {loading
        ? Array.from({ length: cards.length || 4 }, (_, index) => <StatCardSkeleton key={index} />)
        : cards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              metric={card.metric}
              delta={card.delta}
              // #273 — omit the sparkline slot entirely when there is no trend data, rather than
              // rendering `<Sparkline data={[]} />`: `Sparkline` already draws nothing for fewer
              // than two points, but `StatCard` would still reserve the slot's layout for an
              // element that renders empty, which is the "flat/zero decorative line" shape this
              // ticket bans -- just invisible instead of visibly flat.
              sparkline={card.sparklineData ? <Sparkline data={card.sparklineData} /> : undefined}
              className="w-full lg:min-w-0 lg:flex-1 lg:basis-[209px]"
            />
          ))}
    </div>
  );
}
