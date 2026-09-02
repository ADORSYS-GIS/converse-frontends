export type ToggleProps = {
  /** Current switch state — controlled, the caller owns it (console-ui skill "State"). */
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /**
   * Visible label. When set, it is wired to the switch via Base UI `Field.Label`'s
   * `aria-labelledby` association, matching a real `<label>`'s click-to-toggle behaviour.
   * Omit only when an external label already exists (e.g. a `SettingsRow`'s own `label` prop) —
   * `aria-label` is then required instead.
   */
  label?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};
