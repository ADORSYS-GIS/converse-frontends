/**
 * `Project.modelPolicy`/`Project.allowedModels`'s own editing controls (IA v3 phase 2,
 * `/settings/policies`) — `setProjectModelPolicy` (a closed 3-value Select) and
 * `setProjectAllowedModels` (a catalogue-fed multi-select), the two dedicated write paths
 * `packages/authz-rpc/schema/authz.cstack` gives these fields (see this section's own
 * `component.tsx` doc comment for the full backend contract this mirrors).
 */
export type ModelPolicy = 'allow_all' | 'allowlist' | 'deny_all';

export const MODEL_POLICY_VALUES: ModelPolicy[] = ['allow_all', 'allowlist', 'deny_all'];

/** One entry from `procedure.listModelCatalog` — the operator-configured AI-model catalogue. */
export interface ModelCatalogEntry {
  id: string;
  name: string;
}

export interface ProjectPolicyControlsProps {
  /**
   * `Project.modelPolicy` — one of `MODEL_POLICY_VALUES`, but read as a plain string (never a
   * union) the same way the schema itself keeps it: an unrecognised value is a real state the
   * console may receive (client/server drift) and renders as-is via the Select's own current
   * value, rather than being coerced to one of the three.
   */
  modelPolicy: string;
  onModelPolicyChange: (value: ModelPolicy) => void;
  /** A pending `setProjectModelPolicy` write — disables the Select while it resolves. */
  policySaving?: boolean;
  /** A genuine failed write, e.g. the backend's own `BadRequest` when a caller (bypassing the
   *  client-side guard below) tries `allowlist` with an empty `allowedModels`. */
  policyError?: string;

  /** `Project.allowedModels`, resolved to plain catalogue ids — never the raw `Json?` column. */
  allowedModels: string[];
  onAllowedModelsChange: (values: string[]) => void;
  /** `procedure.listModelCatalog`'s own response — the ids `allowedModels` may name. */
  catalog: ModelCatalogEntry[];
  catalogLoading?: boolean;
  /** A genuine failed `listModelCatalog` fetch — distinct from a settled, empty catalogue (which
   *  renders as `InlineStatus`, `console-ui` skill's "never fabricate" states clause). */
  catalogError?: string;
  onRetryCatalog?: () => void;
  /** A pending `setProjectAllowedModels` write — disables the combobox while it resolves. */
  allowedModelsSaving?: boolean;
  allowedModelsError?: string;
  className?: string;
}
