export type ScopeOption = {
  id: string;
  label: string;
};

export type ScopeProjectOption = ScopeOption & {
  accountId: string;
};

export type ScopeSelectValue = {
  accountId: string;
  projectId: string | null;
};

export type ScopeSelectProps = {
  accounts: ScopeOption[];
  projects: ScopeProjectOption[];
  value: ScopeSelectValue;
  /** Changing the account resets `projectId` to `null` — this component always does that itself. */
  onChange: (value: ScopeSelectValue) => void;
  /** Label for the project select when no project is selected yet. Defaults to "All projects". */
  projectPlaceholder?: string;
  className?: string;
};
