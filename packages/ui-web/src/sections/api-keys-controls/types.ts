import type { SegmentedOption } from '../../components/segmented-control';
import type { SelectFieldProps } from '../../components/select-field';

export interface ApiKeysControlsProps {
  /**
   * Which project's keys are listed. Leads the toolbar because on THIS screen it is not a filter
   * but a precondition — a key belongs to exactly one project, and creation is impossible until
   * one is chosen. (Account is not here: it is identity, and lives in the header. See
   * `AccountBadge`.)
   */
  projectField: Omit<SelectFieldProps, 'layout'>;
  statusOptions: SegmentedOption<string>[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** Omit to render the action disabled — pass `createDisabledReason` to say why. */
  onCreate?: () => void;
  createLabel?: string;
  /**
   * Why a key cannot be created right now, e.g. "Select a project to create a key." Rendered as
   * the disabled action's `title` AND as a visible line beneath it: a disabled button with no
   * stated reason is a dead end, and this one is genuinely common (the default scope is
   * "All projects", which no key can belong to).
   */
  createDisabledReason?: string;
  className?: string;
}
