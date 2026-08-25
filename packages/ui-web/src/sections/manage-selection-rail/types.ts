import type { ProjectRow } from '../manage-projects-ledger/types';

export interface ManageSelectionRailProps {
  /** The row the rail currently targets — `null` shows the inline "No rows selected." line. */
  project: ProjectRow | null;
  className?: string;
}
