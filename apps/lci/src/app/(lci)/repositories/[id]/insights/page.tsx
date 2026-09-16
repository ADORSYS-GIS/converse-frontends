import { notFound } from 'next/navigation';

import { AnalyticsBoard } from '../../../../../containers/analytics-board';
import { parseAnalyticsRange, resolveAnalyticsWindow } from '../../../../../lib/domain/analytics';
import { getFeedbackAnalytics, getReviewAnalytics } from '../../../../../lib/server/api';
import { now as fetchNow } from '../../../../../lib/server/now';

export const dynamic = 'force-dynamic';

/** A repository's Insights tab: the Overview's analytics board, scoped to this repository. The
 *  segment's layout has already resolved the repository and 404s an unknown one. */
export default async function RepositoryInsightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id: rawId }, { range }, now] = await Promise.all([params, searchParams, fetchNow()]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const window = { ...resolveAnalyticsWindow(parseAnalyticsRange(range), now), repositoryId: id };
  const [reviews, feedback] = await Promise.all([
    getReviewAnalytics(window),
    getFeedbackAnalytics(window),
  ]);

  return <AnalyticsBoard scope="repository" reviews={reviews} feedback={feedback} now={now} />;
}
