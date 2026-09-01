import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { StatCard } from '@lightbridge/ui-web/src/components/stat-card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { computeKpis, formatSeconds } from '../../lib/domain/insights';
import type { Task } from '../../lib/domain/tasks';
import { listTasks } from '../../lib/server/api';
import { now as fetchNow } from '../../lib/server/now';

export const dynamic = 'force-dynamic';

/**
 * Overview — the first real `apps/lci` screen wired to live data (epic #328, story #331).
 * Ported from `lightbridge-code-intelligence/apps/web/app/dashboard/page.tsx`'s KPI row, rebuilt
 * against the current `ui-web`: `PageHeader` + `Card`-wrapped stat row (ADR 0012 D1/D3), not the
 * old header-band/never-a-card shell this design pass's now-deleted wireframes assumed.
 *
 * The runs-over-time sparkline and by-repo/by-outcome breakdowns from the source screen are not
 * ported yet — `formatSeconds`/`computeKpis` cover only the stat row here; the rest follows the
 * identical pattern once `packages/chart-core` charts are wired the same way `apps/console`'s
 * Overview already does it.
 */
export default async function OverviewPage() {
  const result = await listTasks();
  const now = await fetchNow();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" subtitle="Task runs across your connected repositories." />

      {!result.ok ? (
        <Card>
          <ErrorLine
            message={
              result.reason === 'unauthenticated'
                ? "Your session can't reach the control plane. Sign in again."
                : result.reason === 'unavailable'
                  ? 'The control plane is unreachable right now.'
                  : `Couldn't load runs${result.status ? ` (HTTP ${result.status})` : ''}.`
            }
          />
        </Card>
      ) : (
        <OverviewStats tasks={result.data} now={now} />
      )}
    </div>
  );
}

function OverviewStats({ tasks, now }: { tasks: Task[]; now: number }) {
  const kpis = computeKpis(tasks, now);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <StatCard label="Total runs" metric={String(kpis.total)} />
      </Card>
      <Card>
        <StatCard
          label="Pass rate"
          metric={kpis.passRate === null ? '—' : `${Math.round(kpis.passRate * 100)}%`}
        />
      </Card>
      <Card>
        <StatCard
          label="p50 duration"
          metric={kpis.p50Seconds === null ? '—' : formatSeconds(kpis.p50Seconds)}
        />
      </Card>
      <Card>
        <StatCard label="Active" metric={String(kpis.active)} />
      </Card>
    </div>
  );
}
