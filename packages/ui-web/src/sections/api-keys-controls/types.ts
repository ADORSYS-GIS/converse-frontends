import type { SegmentedOption } from '../../components/segmented-control';
import type { SelectFieldProps } from '../../components/select-field';

export interface ApiKeysControlsProps {
  /**
   * Which project's keys are listed — a ledger filter only. It is NOT a precondition for
   * creating a key (live findings #4, 2026-08-30): `CreateApiKeyDialog` asks for the target
   * project itself, so `+ New key` stays enabled at "All projects," the toolbar's own default
   * scope. (Account is not here: it is identity, and lives in the sidebar's workspace switcher.
   * See `AccountBadge`.)
   */
  projectField: Omit<SelectFieldProps, 'layout'>;
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}
