import type { Project } from '@lightbridge/authz-rpc';
import type { ProjectSettingsRow } from '@lightbridge/ui-web/src/sections/project-settings';

/**
 * Pure adapter from the generated `Project` model to the Settings screen's row shape.
 *
 * The sibling of `project-rows.ts`, and deliberately NOT the same mapping: that one feeds the
 * Manage ledger, which compares projects against each other, so it normalises `status` down to a
 * three-value union and drops everything a table has no column for. This one feeds a settings
 * surface, which describes ONE project at a time, so it carries the fields the ledger has no room
 * for (`billingIdentity`, `billingPlan`, `modelPolicy`, `isDefault`) and passes `status` through
 * verbatim.
 *
 * `status` is a plain string here on purpose. `projectStatus()` next door resolves anything
 * outside `active | suspended` to the literal `unknown`, which is right for a status CELL that has
 * to pick one of three renderings; on a settings row the honest thing is to show what the backend
 * actually sent, because a reader looking at this screen is trying to find out what the project IS.
 *
 * Every field below is a real column on `model.Project` (`packages/authz-rpc/schema/authz.cstack`).
 * Nothing is derived, defaulted or invented — in particular there is no spend, budget, member
 * count or key count, because `Project` carries no currency column at all and the list endpoint
 * returns neither relation (the correction issue #270 already made to the Manage ledger).
 *
 * `allowedModels` and `defaultLimits` are deliberately dropped: both are opaque `Json`, and
 * `allowedModels` additionally only means anything under `modelPolicy === 'allowlist'`. A blob in
 * a settings row is noise, not information.
 */
export function toProjectSettingsRow(project: Project): ProjectSettingsRow {
  return {
    id: project.id,
    name: project.name,
    billingIdentity: project.billingIdentity,
    billingPlan: project.billingPlan,
    // A governance tier id from an operator-configured catalogue, never a currency amount and
    // never `Number()`-ed — the same correction issue #269 made for the ledger's own column.
    quotaTier: project.projectQuota ?? null,
    modelPolicy: project.modelPolicy,
    status: project.status,
    isDefault: project.isDefault,
  };
}

export function toProjectSettingsRows(projects: Project[]): ProjectSettingsRow[] {
  return projects.map(toProjectSettingsRow);
}
