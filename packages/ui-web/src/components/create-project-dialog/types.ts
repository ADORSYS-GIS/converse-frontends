export type CreateProjectPlanOption = {
  id: string;
  name: string;
};

export interface CreateProjectDialogProps {
  open: boolean;
  /** e.g. "acct_01" — echoes which account the project is created under. */
  accountLabel: string;

  name: string;
  onNameChange: (name: string) => void;
  /** A server-side validation message targeted at `name` specifically (e.g. a duplicate-name
   *  rejection) — distinct from `error`, which is anything the caller could not attribute to a
   *  single field. */
  nameError?: string;

  billingIdentity: string;
  onBillingIdentityChange: (value: string) => void;
  /** Same idea as `nameError`, targeted at `billingIdentity` — the field is `@unique` on the
   *  backend (`authz.cstack`), so a duplicate identity is the realistic failure this renders. */
  billingIdentityError?: string;

  /** The `listBillingPlans` catalogue — empty while loading, before the first successful fetch. */
  plans: CreateProjectPlanOption[];
  plansLoading: boolean;
  /** Set when the catalogue fetch itself failed — distinct from a submit-time `error`. */
  plansError?: string;
  onRetryPlans: () => void;

  planId: string | null;
  onPlanChange: (planId: string) => void;

  submitting: boolean;
  /** A submit-time failure not attributable to `name`/`billingIdentity` specifically — kept
   *  inline, the dialog stays open (console-ui skill §states). */
  error?: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}
