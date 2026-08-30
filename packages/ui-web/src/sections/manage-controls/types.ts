import type { SelectFieldOption } from '../../components/select-field';
import type { SegmentedOption } from '../../components/segmented-control';

export type ManageOption = SelectFieldOption;

export interface ManageControlsProps {
  accountValue: string;
  accountOptions: ManageOption[];
  onAccountChange: (value: string) => void;
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  budgetStateValue: string;
  budgetStateOptions: ManageOption[];
  onBudgetStateChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}
