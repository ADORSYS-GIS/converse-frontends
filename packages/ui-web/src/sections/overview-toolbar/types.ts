import type { SelectFieldProps } from '../../components/select-field';

/** A toolbar control, in the order the toolbar lays them out. `SelectField`'s own props minus the
 * layout, which the toolbar owns. */
export type OverviewToolbarField = Omit<SelectFieldProps, 'layout'>;

export interface OverviewToolbarProps {
  /** What the SPEND chart is a picture *of*: range, bucket, group-by. */
  rangeField: OverviewToolbarField;
  bucketField: OverviewToolbarField;
  groupByField: OverviewToolbarField;
  /** Which slice the dashboards are drawn from. Account is NOT here — scope is identity, and it
   * lives in the header (see this section's docstring). */
  projectField: OverviewToolbarField;
  modelField: OverviewToolbarField;
  /** Omit to render no export affordance at all — never render a dead control. */
  onExport?: () => void;
  exportLabel?: string;
  /** Why export is unavailable. When set, the action renders disabled with this as its title. */
  exportDisabledReason?: string;
  className?: string;
}
