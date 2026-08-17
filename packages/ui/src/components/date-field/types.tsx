import type { TextFieldVariantProps } from '../text-field/cva';

export type DateFieldProps = TextFieldVariantProps & {
  /** `YYYY-MM-DD`, matching the native `<input type="date">` wire format. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** `YYYY-MM-DD` floor/ceiling the native date picker enforces. */
  min?: string;
  max?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};
