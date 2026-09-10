export interface SelectFieldOption {
  value: string;
  label: string;
  /**
   * Renders the option non-selectable — `sections/project-policy-controls`' own use: the backend
   * rejects switching `modelPolicy` to `allowlist` while `allowedModels` is empty with a
   * `BadRequest` (`setProjectModelPolicy`'s own doc comment, `authz.cstack`), so the option is
   * disabled rather than offered-then-failing. `reason` is the disabled option's own `title`
   * tooltip.
   */
  disabled?: boolean;
  reason?: string;
}

/**
 * The console's ONE dropdown primitive — a Base UI `Select` (never a native `<select>`, never a
 * hand-rolled `Select.Root` tree at the call site) styled to the `Field` control treatment.
 * README §4's component inventory names `SelectField` explicitly; every single-value picker in
 * the console renders this component — `ScopeSelect`'s two cascaded pickers included, which
 * compose `SelectField` rather than re-declaring the same trigger/popup/item markup a second
 * time (unify-select, issue #368).
 *
 * Named `SelectField`, not `RailSelect`, since the console's read-only screens now put these in a
 * horizontal toolbar rather than a rail (owner review 2026-08-29) — the old name described one
 * mount point rather than the control.
 */
export interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  /**
   * `stacked` (default) puts the label above a full-width control — the rail column's shape.
   * `inline` puts the label beside a control sized to its own content, for a horizontal toolbar
   * where six stacked label/control pairs would be six columns of wasted width.
   */
  layout?: 'stacked' | 'inline';
  /**
   * Visually hides the label (`sr-only`) while keeping it as the trigger's real accessible name
   * (phase 9 — a select's chosen option already says what it is, e.g. "Last 30 days"; a label
   * beside it too is the "Group by Project Project All projects" stutter the owner flagged).
   */
  hideLabel?: boolean;
  /**
   * Disables the whole control — e.g. while the option catalogue it lists is still loading, or
   * empty. The one capability that was missing here and drove `CreateApiKeyDialog`/
   * `CreateProjectDialog` to hand-roll their own billing-plan `Select.Root` instead of using this
   * component (unify-select, issue #368) — both now pass this instead.
   */
  disabled?: boolean;
  /**
   * When set, the trigger's border switches to `primary` and this text renders as a `meta` error
   * line beneath it — the identical contract `Field`'s own `error?: string` prop carries, so a
   * `SelectField` in an error state reads as a `Field` sibling, not a control with its own rule.
   */
  error?: string;
  /**
   * A concrete sample of the option an author would usually pick — the identical contract
   * `Field`'s own `example?: string` carries (issue #445): a muted `meta` line between the label
   * and the trigger, wired into the trigger's `aria-describedby`, and a `stacked`-layout
   * affordance only (an `inline` toolbar row has nothing underneath it).
   */
  example?: string;
  className?: string;
}
