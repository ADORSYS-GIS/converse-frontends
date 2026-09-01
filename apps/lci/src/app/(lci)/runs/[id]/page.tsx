import { notFound } from 'next/navigation';

import { RunDetailCentre } from '../../../../containers/run-detail-centre';
import { getReview, getTask } from '../../../../lib/server/api';
import { now as fetchNow } from '../../../../lib/server/now';

export const dynamic = 'force-dynamic';

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [taskResult, now] = await Promise.all([getTask(id), fetchNow()]);

  if (taskResult.ok && !taskResult.data) notFound();

  const reviewResult = taskResult.ok && taskResult.data ? await getReview(id) : null;

  return <RunDetailCentre taskResult={taskResult} reviewResult={reviewResult} now={now} />;
}
