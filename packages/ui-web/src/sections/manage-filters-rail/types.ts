import type { RailSelectOption } from '../../components/rail-select';
import type { SegmentedOption } from '../../components/segmented-control';

export type ManageOption = RailSelectOption;

export interface ManageFiltersRailProps {
  accountValue: string;
  accountOptions: ManageOption[];
  onAccountChange: (value: string) => void;
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  budgetStateValue: string;
  budgetStateOptions: ManageOption[];
  onBudgetStateChange: (value: string) => void;
  className?: string;
}
