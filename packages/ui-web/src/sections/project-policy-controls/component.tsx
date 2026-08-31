import { Combobox } from '@base-ui/react/combobox';
import { Field } from '@base-ui/react/field';
import React from 'react';

import { cn } from '../../cn';
import { Chevron } from '../../components/chevron';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SelectField } from '../../components/select-field';
import type { SelectFieldOption } from '../../components/select-field';
import {
  OVERLAY_ANCHORED_POPUP_FLOATING_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_POSITIONER_CLASS,
} from '../../lib/overlay';
import { fieldLabelClassName } from '../../components/field/field-classes';
import { ZoneHeading } from '../../lib/zone-heading';
import type { ModelPolicy, ProjectPolicyControlsProps } from './types';

/**
 * `Project.modelPolicy`/`Project.allowedModels`'s own editing controls, composed onto
 * `/settings/policies`' project detail sheet (`containers/policies-centre.tsx`) beside
 * `ProjectSettingsDetail`'s existing read-only "Model policy" row — that row keeps showing the
 * CURRENT value (`ProjectSettingsDetail`'s own contract, unchanged); this section is where it
 * gets CHANGED.
 *
 * Two dedicated write paths, mirrored one-for-one from `packages/authz-rpc/schema/authz.cstack`:
 *
 *  - `setProjectModelPolicy` — `modelPolicy` is a closed 3-value set (`allow_all`/`allowlist`/
 *    `deny_all`), so it is a `SelectField`, never a native `<select>` or a free-text field.
 *  - `setProjectAllowedModels` — `allowedModels` is validated against `procedure.listModelCatalog`
 *    server-side (`ModelCatalog::invalid_ids`), so this is a Base UI `Combobox` in `multiple` mode
 *    fed by that SAME catalogue, not a free-text list a typo could silently mismatch.
 *
 * **The backend rule this section enforces client-side, not just displays**: `setProjectModelPolicy`
 * refuses `modelPolicy: "allowlist"` with a `BadRequest` whenever the project's CURRENT
 * `allowedModels` is `null`/`[]` (that procedure's own doc comment — a deliberate refusal, not a
 * bug, "loses no expressiveness: `deny_all` already exists as the named way to block everything").
 * The `allowlist` option in the Select below is `disabled` (`SelectFieldOption.disabled`, a
 * per-item disable this section's own need added to `SelectField`) whenever `allowedModels` is
 * empty AND the project isn't already in `allowlist` — "don't offer the transition until ≥1 model
 * chosen," not "offer it and let the write fail." A project already sitting in `allowlist` mode
 * keeps that option enabled regardless (nothing to guard: it is already past the rule).
 */

const MODEL_POLICY_LABEL: Record<ModelPolicy, string> = {
  allow_all: 'Allow all models',
  allowlist: 'Allowlist only',
  deny_all: 'Deny all models',
};

export const ALLOWLIST_BLOCKED_REASON =
  'Choose at least one allowed model below before switching to allowlist-only.';

function policyOptions(allowedModelsCount: number, currentPolicy: string): SelectFieldOption[] {
  const allowlistBlocked = allowedModelsCount === 0 && currentPolicy !== 'allowlist';
  return (['allow_all', 'allowlist', 'deny_all'] as ModelPolicy[]).map((value) => ({
    value,
    label: MODEL_POLICY_LABEL[value],
    disabled: value === 'allowlist' && allowlistBlocked,
    reason: value === 'allowlist' && allowlistBlocked ? ALLOWLIST_BLOCKED_REASON : undefined,
  }));
}

export function ProjectPolicyControls({
  modelPolicy,
  onModelPolicyChange,
  policySaving,
  policyError,
  allowedModels,
  onAllowedModelsChange,
  catalog,
  catalogLoading,
  catalogError,
  onRetryCatalog,
  allowedModelsSaving,
  allowedModelsError,
  className,
}: ProjectPolicyControlsProps) {
  const catalogOptions = catalog.map((entry) => ({ value: entry.id, label: entry.name }));
  const catalogEmpty = !catalogLoading && !catalogError && catalog.length === 0;

  return (
    <section aria-label="Model access policy" className={cn('flex flex-col gap-4', className)}>
      <ZoneHeading label="Model access policy" />

      <div className="flex flex-col gap-1">
        <SelectField
          label="Model policy"
          value={modelPolicy}
          options={policyOptions(allowedModels.length, modelPolicy)}
          onChange={(value) => onModelPolicyChange(value as ModelPolicy)}
        />
        {policySaving ? <InlineStatus>Saving…</InlineStatus> : null}
        {policyError ? <ErrorLine message={policyError} /> : null}
      </div>

      <div className="flex flex-col gap-1">
        {catalogError ? (
          <ErrorLine message={catalogError} onRetry={onRetryCatalog} />
        ) : catalogEmpty ? (
          <InlineStatus>No model catalogue is configured — every model is reachable.</InlineStatus>
        ) : (
          <Combobox.Root
            multiple
            items={catalogOptions}
            value={allowedModels}
            onValueChange={(next) => onAllowedModelsChange(next)}
            disabled={catalogLoading || allowedModelsSaving}>
            <Field.Root className="fieldset">
              <Field.Label className={fieldLabelClassName}>Allowed models</Field.Label>
              <Combobox.Chips className="combobox-chips">
                {allowedModels.map((id) => {
                  const entry = catalog.find((option) => option.id === id);
                  return (
                    <Combobox.Chip key={id} className="combobox-chip">
                      {entry?.name ?? id}
                      <Combobox.ChipRemove
                        aria-label={`Remove ${entry?.name ?? id}`}
                        className="combobox-chip-remove">
                        ×
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  );
                })}
                <Combobox.Input
                  placeholder={allowedModels.length === 0 ? 'Search models…' : ''}
                  className="combobox-input"
                />
              </Combobox.Chips>
              <Combobox.Icon>
                <Chevron />
              </Combobox.Icon>
            </Field.Root>
            <Combobox.Portal>
              <Combobox.Positioner sideOffset={4} className={OVERLAY_POSITIONER_CLASS}>
                <Combobox.Popup className={OVERLAY_ANCHORED_POPUP_FLOATING_CLASS}>
                  <Combobox.Empty className={OVERLAY_ITEM_CLASS}>No models match.</Combobox.Empty>
                  <Combobox.List>
                    {(option: { value: string; label: string }) => (
                      <Combobox.Item
                        key={option.value}
                        value={option.value}
                        className={OVERLAY_ITEM_CLASS}>
                        {option.label}
                      </Combobox.Item>
                    )}
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        )}
        {catalogLoading ? <InlineStatus>Loading model catalogue…</InlineStatus> : null}
        {allowedModelsSaving ? <InlineStatus>Saving…</InlineStatus> : null}
        {allowedModelsError ? <ErrorLine message={allowedModelsError} /> : null}
      </div>
    </section>
  );
}
