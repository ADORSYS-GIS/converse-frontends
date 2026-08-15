import { cva, type VariantProps } from 'class-variance-authority';

// Same surface treatment as SectionCard/Card's default tone — a KPI tile is
// just a card whose body is one big number, not a distinct visual language.
export const statCardVariants = cva('w-full rounded-2xl bg-surface shadow-sm', {
  variants: {
    size: {
      sm: 'p-4',
      md: 'p-6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const statCardTrendVariants = cva('text-xs font-semibold', {
  variants: {
    direction: {
      up: 'text-success',
      down: 'text-error',
      flat: 'text-subtle',
    },
  },
  defaultVariants: {
    direction: 'flat',
  },
});

export type StatCardVariantProps = VariantProps<typeof statCardVariants>;
export type StatCardTrendVariantProps = VariantProps<typeof statCardTrendVariants>;
