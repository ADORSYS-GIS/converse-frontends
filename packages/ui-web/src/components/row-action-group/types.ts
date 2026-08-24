export interface RowAction {
  key: string;
  label: string;
  onClick: () => void;
  /** Text emphasis, not colour-by-status: `strong` = `--strong` (the emphasised default,
   * e.g. Revoke — ADR 0003), `default` = `--body`, `muted` = `--muted` (e.g. Del). */
  emphasis?: 'strong' | 'default' | 'muted';
  disabled?: boolean;
}

export interface RowActionGroupProps {
  actions: RowAction[];
  /** Accessible name for the action group. */
  'aria-label'?: string;
  className?: string;
}
