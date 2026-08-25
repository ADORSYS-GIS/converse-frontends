export interface RailSelectOption {
  value: string;
  label: string;
}

/**
 * One rail dropdown — a controlled native `<select>` styled to the `Field` control treatment.
 * README §4 lists no dedicated "Select" primitive; `ScopeSelect` follows the same
 * native-select-plus-styling pattern for its own two dropdowns, and this is that pattern
 * extracted so every rail section (VIEW, FILTERS on Overview; FILTERS on Manage) shares one
 * control instead of three near-identical local copies.
 */
export interface RailSelectProps {
  label: string;
  value: string;
  options: RailSelectOption[];
  onChange: (value: string) => void;
  className?: string;
}
