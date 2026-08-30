import type { SegmentedOption } from '../../components/segmented-control';
import type { SelectFieldProps } from '../../components/select-field';

export interface ApiKeysControlsProps {
  /**
   * Which project's keys are listed. Leads the toolbar — on this screen it is not just a filter
   * but a precondition for creating a key (a key belongs to exactly one project). (Account is not
   * here: it is identity, and lives in the sidebar's workspace switcher. See `AccountBadge`.)
   */
  projectField: Omit<SelectFieldProps, 'layout'>;
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}
