import type { SegmentedOption } from '../../components/segmented-control';

export interface ApiKeysFiltersRailProps {
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}
