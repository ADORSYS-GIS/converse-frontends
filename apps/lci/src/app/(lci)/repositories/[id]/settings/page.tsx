import { notFound } from 'next/navigation';

import { RepositorySettingsCentre } from '../../../../../containers/repository-settings-centre';
import { getRepoSettings, hasPermission } from '../../../../../lib/server/admin';
import { currentClaims } from '../../../../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function RepositorySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [result, claims] = await Promise.all([getRepoSettings(id), currentClaims()]);

  return (
    <RepositorySettingsCentre
      id={id}
      result={result}
      canConfigure={hasPermission(claims, 'repo:configure')}
    />
  );
}
