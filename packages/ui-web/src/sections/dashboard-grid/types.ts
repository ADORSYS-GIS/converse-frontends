import type { ReactNode } from 'react';

export interface DashboardGridProps {
  /** `DashboardPanel`s. A panel declaring `span={2}` occupies both columns; the grid reads that
   *  off the `data-span` attribute the panel already sets on its own card, so nothing has to be
   *  restated here. */
  children: ReactNode;
  className?: string;
}
