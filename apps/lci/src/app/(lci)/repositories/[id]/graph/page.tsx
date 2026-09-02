import { notFound } from 'next/navigation';

import { CodeGraphPanel } from '../../../../../containers/graph/code-graph-panel';

export const dynamic = 'force-dynamic';

/** Repository code-graph tab — the graph itself is fetched client-side (`CodeGraphPanel` drives
 *  interactive browse/similar queries via same-origin API proxy routes), so this server component
 *  only validates the id and hands off. */
export default async function RepositoryGraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return <CodeGraphPanel repoId={id} />;
}
