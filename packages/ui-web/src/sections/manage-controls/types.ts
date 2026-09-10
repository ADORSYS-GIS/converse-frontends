import type { SelectFieldOption } from '../../components/select-field';
import type { SegmentedOption } from '../../components/segmented-control';

export type ManageOption = SelectFieldOption;

export interface ManageControlsProps {
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  budgetStateValue: string;
  budgetStateOptions: ManageOption[];
  onBudgetStateChange: (value: string) => void;
}
