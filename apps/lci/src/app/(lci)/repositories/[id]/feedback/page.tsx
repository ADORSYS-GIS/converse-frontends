import { notFound } from 'next/navigation';

import { FeedbackBoard } from '../../../../../containers/feedback-board';
import { parseFeedbackRange, resolveFeedbackWindow } from '../../../../../lib/domain/feedback';
import { getFeedbackAnalytics } from '../../../../../lib/server/api';
import { now as fetchNow } from '../../../../../lib/server/now';

export const dynamic = 'force-dynamic';

/** A repository's Feedback tab: the same board as the Feedback page, scoped to this repository. The
 *  segment's layout has already resolved the repository and 404s an unknown one. */
export default async function RepositoryFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id: rawId }, { range }, now] = await Promise.all([params, searchParams, fetchNow()]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const window = { ...resolveFeedbackWindow(parseFeedbackRange(range), now), repositoryId: id };
  const feedback = await getFeedbackAnalytics(window);

  return <FeedbackBoard scope="repository" feedback={feedback} now={now} />;
}
