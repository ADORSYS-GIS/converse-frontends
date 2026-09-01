import type { ProjectRow } from '../projects-ledger/types';

export interface ProjectDetailProps {
  /** The project `DetailSheet` currently targets. The sheet's own `title`/`subtitle` already
   *  carry the name and account (see `projects-centre.tsx`), so this renders only the facts that
   *  are not already chrome. */
  project: ProjectRow;
  className?: string;
}
