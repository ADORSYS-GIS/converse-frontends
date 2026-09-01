export interface ProjectNameDialogProps {
  open: boolean;
  /**
   * The project being renamed, rendered as read-only context.
   *
   * `projects.id` is caller-minted (`createId()` at create time — unlike `accounts.id`, which IS
   * the JWT subject), so echoing it here is the only way the dialog says *which* of an account's
   * projects this write targets. Two projects may share a display name; their ids never do.
   */
  projectId: string;
  /** What the project is called today — the subject of the sentence under the title. */
  currentName: string;

  name: string;
  onNameChange: (name: string) => void;
  /**
   * A server-side rejection this caller could attribute to `name` specifically.
   *
   * `Project.name` is a plain `String` in `authz.cstack` with no `@length`/`@regex` attribute, so
   * the console adds no client-side rule of its own beyond "not blank" — the field is `String`,
   * not `String?`, which is the one difference from `Account.name` and the reason
   * `canSubmit` here is a genuine "did you fill it in" gate rather than a no-op-write guard alone.
   */
  nameError?: string;

  submitting: boolean;
  /** A submit-time failure not attributable to `name`. Kept inline; the dialog stays open. */
  error?: string;
  /**
   * False for a blank name (the column is NOT NULL) and false when the trimmed value already
   * equals what the project is called, so the dialog cannot fire a write that changes nothing.
   */
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}
