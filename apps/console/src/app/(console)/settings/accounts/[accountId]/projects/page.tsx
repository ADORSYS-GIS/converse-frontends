import { ProjectsCentre } from '../../../../../../containers/projects-centre';

export const dynamic = 'force-dynamic';

/** `/settings/accounts/<id>/projects` — the projects ledger (IA v3 phase E, moved from
 *  `/accounts/<id>/projects` — the old path 308s here verbatim, `middleware.ts`). The shell
 *  around it is mounted once by `(console)/layout.tsx`. `?create=true` opens the create-project
 *  dialog on load — see `ProjectsCentre`'s own doc comment. */
export default function AccountProjectsRoute() {
  return <ProjectsCentre />;
}
