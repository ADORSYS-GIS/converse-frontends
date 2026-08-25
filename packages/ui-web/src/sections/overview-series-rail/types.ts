import type { ChartLegendItem } from '../../components/chart-legend';

export interface OverviewSeriesRailProps {
  items: ChartLegendItem[];
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
  className?: string;
}
