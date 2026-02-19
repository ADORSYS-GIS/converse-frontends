import { cva, type VariantProps } from 'class-variance-authority';

export const textVariants = cva('text-ink', {
  variants: {
    intent: {
      eyebrow: 'text-xs uppercase tracking-[0.28em] text-subtle',
      title: 'text-2xl font-semibold text-ink',
      body: 'text-base text-soft',
      bodyStrong: 'text-base font-semibold text-ink',
      key: 'text-sm text-subtle',
      value: 'text-2xl font-semibold text-ink',
      caption: 'text-sm text-subtle',
      link: 'text-sm font-semibold text-primary',
      warning: 'text-sm text-secondary',
      inverseEyebrow: 'text-xs uppercase tracking-[0.28em] text-surface/70',
      inverseTitle: 'text-2xl font-semibold text-surface',
      inverseBody: 'text-base text-surface',
      inverseBodyStrong: 'text-base font-semibold text-surface',
      inverseValue: 'text-3xl font-semibold text-surface',
      inverseCaption: 'text-sm text-surface/80',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    intent: 'body',
    align: 'left',
  },
});

export type TextVariantProps = VariantProps<typeof textVariants>;
