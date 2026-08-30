export interface RequestRefillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account this refill would land on — read-only context, `AccountNameDialog`'s own
   *  "echo the subject" idiom. */
  accountLabel: string;
  /**
   * The active refill policy's allowed amounts, ascending, already formatted for display
   * (`+$12.00`) — `use-budget-refill.ts`'s own micros-to-major conversion happens once, in
   * `apps/console`, never here. `value` stays the raw decimal-micros string: `SelectField`'s
   * contract is string in, string out, and a micros amount can exceed
   * `Number.MAX_SAFE_INTEGER`.
   */
  amountOptions: { value: string; label: string }[];
  /** The selected amount's micros value — the smallest allowed amount, preselected, when nothing
   *  has been chosen explicitly yet (`use-request-refill-dialog.ts`'s own resolution). */
  amountMicros: string;
  onAmountChange: (amountMicros: string) => void;
  submitting: boolean;
  /** A submit-time failure. Kept inline; the dialog stays open. */
  error?: string;
  canSubmit: boolean;
  onSubmit: () => void;
}
