import { cva, type VariantProps } from 'class-variance-authority';

// The Select shares TextField's chrome — component.tsx composes `textFieldVariants`
// for the border/padding/typography — and layers on the select-only affordances:
// strip the platform appearance so the box matches TextField, and leave room on the
// right so a caret/arrow never overlaps the value.
export const selectVariants = cva('appearance-none bg-transparent pr-8');

export type SelectVariantProps = VariantProps<typeof selectVariants>;
