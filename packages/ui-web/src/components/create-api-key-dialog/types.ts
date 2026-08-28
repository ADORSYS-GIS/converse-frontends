import type { BillingPlanLimits } from '../../lib/billing-plan-limits';
import type { SegmentedOption } from '../segmented-control/types';

export type CreateApiKeyPlanOption = {
  id: string;
  name: string;
  /** Absent means "no configured limit" — see `formatBillingPlanLimits`'s doc comment. */
  limits?: BillingPlanLimits | null;
};

export interface CreateApiKeyDialogProps {
  open: boolean;
  /** e.g. "acct_01 / Default Project" — echoes which project the key is scoped to. */
  projectLabel: string;

  name: string;
  onNameChange: (name: string) => void;

  /** Day-count presets, kept under the operator's documented expiry ceiling with margin. */
  expiryDays: string;
  expiryOptions: SegmentedOption<string>[];
  onExpiryDaysChange: (days: string) => void;

  /** The `listBillingPlans` catalogue — empty while loading, before the first successful fetch. */
  plans: CreateApiKeyPlanOption[];
  plansLoading: boolean;
  /** Set when the catalogue fetch itself failed — distinct from a submit-time `error`. */
  plansError?: string;
  onRetryPlans: () => void;

  planId: string | null;
  onPlanChange: (planId: string) => void;

  submitting: boolean;
  /** A submit-time failure — kept inline, the dialog stays open (console-ui skill §states). */
  error?: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}
