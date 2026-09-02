import { OverviewCentre } from '../../containers/overview-centre';
import { listTasks } from '../../lib/server/api';
import { now as fetchNow } from '../../lib/server/now';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const result = await listTasks();
  const now = await fetchNow();

  return <OverviewCentre result={result} now={now} />;
}
