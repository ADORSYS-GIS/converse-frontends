import { notFound } from 'next/navigation';

import { RepositoryOverviewCentre } from '../../../../containers/repository-overview-centre';
import { getAdminRepo } from '../../../../lib/server/admin';
import { now as fetchNow } from '../../../../lib/server/now';

export const dynamic = 'force-dynamic';

export default async function RepositoryOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [result, now] = await Promise.all([getAdminRepo(id), fetchNow()]);
  if (result.ok && !result.data) notFound();

  return (
    <RepositoryOverviewCentre
      result={result}
      now={now}
      grafanaBaseUrl={process.env.NEXT_PUBLIC_GRAFANA_URL ?? null}
    />
  );
}
