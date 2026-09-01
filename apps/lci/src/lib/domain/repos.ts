import type { StatusTone } from './tasks';

/**
 * Repository domain types for the Repositories view. Mirrors the control plane's `/repositories`
 * payload (`RepositoryRow` in `services/control-plane/src/db.rs`) — ported from
 * `lightbridge-code-intelligence/apps/web/lib/domain/repos.ts`.
 */

export const REPOS_PAGE_SIZE = 12;

export interface Repository {
  id: number;
  platform_repo_id: number;
  platform: 'github' | 'gitlab';
  owner: string;
  name: string;
  default_branch: string;
  status: string;
  active: boolean;
  approved_at: string | null;
  approved_by: string | null;
  task_count: number;
  last_task_at: string | null;
}

export function repoSlug(repo: Repository): string {
  return `${repo.owner}/${repo.name}`;
}

/** Map the approval `status` (Epic #75) to a `StatusText` tone + label — see `tasks.ts`'s
 *  `statusTone` doc comment for why this is a 3-tone map, not the source app's 5-variant pill. */
export function approvalTone(repo: Repository): { tone: StatusTone; label: string } {
  switch (repo.status) {
    case 'approved':
      return { tone: 'active', label: 'Approved' };
    case 'disabled':
      return { tone: 'muted', label: 'Disabled' };
    case 'pending':
      return { tone: 'attention', label: 'Pending approval' };
    default:
      return { tone: 'muted', label: repo.status };
  }
}
