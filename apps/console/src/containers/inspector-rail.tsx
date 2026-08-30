'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { ProjectDetail } from '@lightbridge/ui-web/src/sections/project-detail';
import { usePathname } from 'next/navigation';

import { useProjectRename } from './use-project-rename';
import { useProjectsScreen } from './use-projects-screen';

/**
 * `ConsoleShell.rail`'s content resolver — mounted exactly once, from `app/(console)/layout.tsx`,
 * beside the shell itself (console-ui skill "Composition — chrome mounted once").
 *
 * **Content policy, the owner's final word on it (2026-08-30, two rounds on the same day, then
 * narrowed again in IA v3 phase 3):** round one asked for a rail that is "never empty by
 * construction"; round two corrected that to "the right rail was empty depending on the
 * situation. Solution: hide it if empty. Simple."; phase 3 then deleted the rail's one STANDING
 * case outright — the `/accounts/<id>/overview` quick-settings panel (`InspectorSettingsPanel`,
 * owner: "account mutations/creation/refill on the Overview rail makes no sense" — the switcher
 * already carries `+ New account`, `/projects` carries `+ New project`, the Budget card links to
 * `/accounts/<id>/refill`, and `/settings/policies` carries rename). This resolver now follows a
 * single rule, stricter than either 2026-08-30 round:
 *
 *  - `/accounts/<id>/projects` — the selected project's detail, ONLY while a row is selected. No
 *    selection, no rail (returns `undefined`, which collapses `ConsoleShell`'s rail column
 *    entirely — see its own doc comment).
 *  - every other route (`/`, `/accounts/<id>/overview`, `/accounts/<id>/api-keys`, `/settings/*`)
 *    — no rail, ever. There is no more standing content for the rail to show.
 *
 * Below `lg`, none of this renders at all — `ConsoleShell` only mounts the `rail` slot inside its
 * `lg:flex` column, so this component's own output is simply never placed on screen there; the
 * SAME selection-driven content instead opens as a `BottomSheet` from each route's own centre
 * (`projects-centre.tsx`).
 *
 * Reuses the FULL screen hook (`useProjectsScreen`) rather than a narrower selection-only query —
 * its underlying `useList` call is deduped against the SAME centre's own instance by TanStack
 * Query's cache (identical resource/pagination/filters produce the identical query key), so this
 * costs no extra network traffic — the two React hook instances share one cache entry, not two
 * independent fetches.
 */
/** The account-scoped route's own trailing segment (`overview`/`projects`/`api-keys`) — `null`
 *  off `/accounts/[accountId]/*` entirely. Mirrors `console-chrome.tsx`'s identical match, kept
 *  as its own copy rather than a shared import: the two modules read the pathname for unrelated
 *  reasons (which rail to show vs. which nav row is active) and neither depends on the other. */
function accountScopedSegment(pathname: string): string | undefined {
  return pathname.match(/^\/accounts\/[^/]+\/([^/]+)/)?.[1];
}

export function InspectorRail() {
  const pathname = usePathname();
  const segment = accountScopedSegment(pathname);

  if (segment === 'projects') return <ProjectsRail />;
  return undefined;
}

function ProjectsRail() {
  const screen = useProjectsScreen(null);
  const project = screen.selectedProject;
  const rename = useProjectRename(project);

  if (project === null) return undefined;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-ink truncate font-sans text-[15px] font-medium">{project.name}</div>
          <div className="text-subtle truncate font-sans text-[12px]">
            {project.account} · {project.statusLabel}
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={rename.open}>
          Rename
        </Button>
      </div>
      <ProjectDetail project={project} />
      <ProjectNameDialog {...rename.dialog} />
    </div>
  );
}
