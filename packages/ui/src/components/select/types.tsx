import type { TextFieldVariantProps } from '../text-field/cva';

export type SelectOption = {
  label: string;
  value: string;
};

export type SelectProps = TextFieldVariantProps & {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};
