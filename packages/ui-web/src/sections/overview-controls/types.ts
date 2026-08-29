import type { DateRangeFieldProps } from '../../components/date-range-field';
import type { SelectFieldProps } from '../../components/select-field';

/** A toolbar control, in the order the toolbar lays them out. `SelectField`'s own props minus the
 * layout, which the toolbar owns. */
export type OverviewControlsField = Omit<SelectFieldProps, 'layout'>;

export interface OverviewControlsProps {
  /** What the SPEND chart is a picture *of*: range, bucket, group-by. Range is a real date-range
   *  picker (presets + calendar), not a three-option dropdown. */
  rangeField: Omit<DateRangeFieldProps, 'layout'>;
  bucketField: OverviewControlsField;
  groupByField: OverviewControlsField;
  /**
   * Which slice the dashboards are drawn from. Account is NOT here — scope is identity, and it
   * lives in the header (see this section's docstring).
   *
   * Both are optional so a screen whose whole point is "every project, unsliced" can omit them
   * rather than render a filter it must then ignore: the admin overview is account-wide by
   * definition, and a project picker there would offer a narrowing the screen refuses to apply.
   * Omitted means "not rendered at all" — never a disabled or dead control.
   */
  projectField?: OverviewControlsField;
  modelField?: OverviewControlsField;
  /** Omit to render no export affordance at all — never render a dead control. */
  onExport?: () => void;
  exportLabel?: string;
  /** Why export is unavailable. When set, the action renders disabled with this as its title. */
  exportDisabledReason?: string;
  className?: string;
}
