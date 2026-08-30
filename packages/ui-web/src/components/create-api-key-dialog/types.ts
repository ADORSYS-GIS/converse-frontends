import type { BillingPlanLimits } from '../../lib/billing-plan-limits';
import type { SegmentedOption } from '../segmented-control/types';
import type { SelectFieldOption } from '../select-field/types';

export type CreateApiKeyPlanOption = {
  id: string;
  name: string;
  /** Absent means "no configured limit" — see `formatBillingPlanLimits`'s doc comment. */
  limits?: BillingPlanLimits | null;
};

export interface CreateApiKeyDialogProps {
  open: boolean;

  /**
   * The projects the caller may create a key in — always non-empty by the time this dialog can
   * open (the container's own trigger stays disabled, with a stated reason, while the account has
   * none; see `use-api-keys-screen.ts`'s `createKeyEligible`).
   *
   * Live findings #4 (2026-08-30): this dialog used to have no project field at all — it only
   * echoed a fixed `projectLabel`, so `+ New key` disabled itself outright whenever the *ledger's
   * own toolbar filter* was scoped to "All projects," with no way to proceed. A key belongs to
   * exactly one project, but which one is this dialog's question now, not the toolbar's.
   */
  projectOptions: SelectFieldOption[];
  projectId: string | null;
  onProjectChange: (projectId: string) => void;
  /** Why the SELECTED project cannot take a new key right now — an ownership/lead check still
   *  resolving, failed, or refused. Rendered as a caption under the Project field; `undefined`
   *  exactly when the selected project is eligible (console-ui skill "Never do: a disabled
   *  control with no stated reason"). */
  projectReason?: string;

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
