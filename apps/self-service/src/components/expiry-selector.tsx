import React, { useEffect, useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { DateField, FormField, SegmentedControl, Stack, Text } from '@lightbridge/ui';

import {
  EXPIRY_MAX_DAYS,
  EXPIRY_PRESET_DAYS,
  EXPIRY_PRESET_ORDER,
  dateOnlyToExpiresAt,
  expiresAtToDateOnly,
  isExpiresAtWithinAllowedRange,
  maxAllowedDateOnly,
  minAllowedDateOnly,
  presetToExpiresAt,
} from '../lib/api-key-expiry';
import type { ExpiryDurationPreset, ExpiryPresetKey } from '../lib/api-key-expiry';

/** Derives which preset an existing `expiresAt` should show as selected on mount: unset (or a
 * legacy key from before every key was required to carry an expiration -- see the standing
 * "all API keys must have an expiry date" requirement) starts on the 30-day preset, same as a
 * fresh create form; any set value starts on "Custom" pre-filled with that exact date. There is
 * no way to tell from a stored `expiresAt` alone whether it was originally set via a duration
 * preset or a specific date, so re-showing it as "Custom" is the only choice that doesn't
 * silently round an existing key's real expiration when its settings screen re-opens it. */
function initialPresetFor(expiresAt?: string | null): ExpiryPresetKey {
  return expiresAt ? 'custom' : 'thirtyDays';
}

/**
 * @param enforceRange Whether an out-of-range custom date resolves to `undefined` (blocking
 *   Save) instead of the parsed value. `true` for every *active* selection (a preset switch or a
 *   custom-date edit) -- this is what makes the 90-day cap and the "must be in the future" floor
 *   real rather than cosmetic, since the native `min`/`max` attributes on `DateField` only stop
 *   most out-of-range picks at the UI layer, not a value that reaches here some other way (manual
 *   typing in a browser that doesn't enforce the native bounds, a future caller that stops using
 *   the calendar widget).
 *
 *   `false` only for the mount effect's one-time seed from an existing key's real `expiresAt`.
 *   A key persisted before this cap existed (or one that has simply already expired) can carry a
 *   value outside today's allowed range; seeding must still show that real value rather than
 *   silently discarding it as `undefined` -- doing so would make the "Custom" field appear blank
 *   and, worse, would flip `expirationValid` to `false` and block Save for *any* edit (e.g. a
 *   pure name change) on a key whose expiration nobody is trying to touch. The `error` copy under
 *   the field still flags an out-of-range value on sight either way (see `customErrorMessage`
 *   below); only the resolved *value* skips the block for a value that came from the record, not
 *   from the user.
 */
function resolve(
  preset: ExpiryPresetKey,
  customDraft: string,
  now: Date,
  enforceRange = true
): string | undefined {
  if (preset === 'custom') {
    const trimmed = customDraft.trim();
    if (trimmed === '') return undefined;
    const resolved = dateOnlyToExpiresAt(trimmed);
    if (resolved === undefined) return undefined;
    if (enforceRange && !isExpiresAtWithinAllowedRange(resolved, now)) return undefined;
    return resolved;
  }
  return presetToExpiresAt(EXPIRY_PRESET_DAYS[preset], now);
}

export type ExpirySelectorProps = {
  /**
   * Seeds the initial preset/custom-date UI, read once on mount: `undefined` or `null` defaults
   * to the 30-day preset (a fresh create form, or a legacy key persisted before every key was
   * required to carry an expiration); an ISO datetime seeds "Custom" pre-filled with that date.
   * There is no "no expiry" seed any more -- every key this app writes back now carries a real
   * expiration.
   *
   * Only read once -- callers that need to reset this when switching to a different key (e.g.
   * the settings screen's key picker) should remount via `key={apiKey?.id}` rather than push
   * updated props into an already-mounted selector.
   */
  initialValue?: string | null;
  /** Fires on every user interaction with the resolved value: an ISO datetime strictly between
   * tomorrow and `EXPIRY_MAX_DAYS` out, or `undefined` while "Custom" holds an incomplete,
   * unparseable, or out-of-range date (callers should block Save on `undefined`, the same
   * convention used elsewhere in this app). Never `null` -- every key this app writes back now
   * carries a real expiration; see `EXPIRY_MAX_DAYS`'s doc comment for why the cap lives in one
   * place. */
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  /** Caption rendered above the preset control, styled like `FormField`'s own label. Callers
   * should pass this instead of wrapping in a `FormField` themselves -- the "Custom" date field
   * already renders its own sub-label, and nesting two `FormField` labels reads oddly. */
  label?: string;
};

export function ExpirySelector({
  initialValue,
  onChange,
  disabled = false,
  label,
}: Readonly<ExpirySelectorProps>) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<ExpiryPresetKey>(() =>
    initialValue === undefined ? 'thirtyDays' : initialPresetFor(initialValue)
  );
  const [customDraft, setCustomDraft] = useState(() => expiresAtToDateOnly(initialValue));

  useEffect(() => {
    // `enforceRange: false` -- this is a seed from `initialValue`, not a user pick; see
    // `resolve`'s doc comment for why the range cap must not apply here.
    onChange(resolve(preset, customDraft, new Date(), false));
    // Fire once on mount with the initial preset/custom-date resolution so callers (e.g. the
    // create form) have a real value before any interaction. Every later change is driven
    // directly by the handlers below, which call `onChange` themselves -- this effect
    // intentionally does not re-run on `preset`/`customDraft` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presetLabels: Record<ExpiryPresetKey, string> = {
    thirtyDays: t('apiKeys.expiry.thirtyDays'),
    sixtyDays: t('apiKeys.expiry.sixtyDays'),
    ninetyDays: t('apiKeys.expiry.ninetyDays'),
    custom: t('apiKeys.expiry.custom'),
  };

  const options = EXPIRY_PRESET_ORDER.map((key) => ({
    key,
    label: presetLabels[key],
    disabled,
  }));

  const handlePresetChange = (key: string) => {
    const nextPreset = key as ExpiryPresetKey;
    setPreset(nextPreset);
    onChange(resolve(nextPreset, customDraft, new Date()));
  };

  const handleDraftChange = (draft: string) => {
    setCustomDraft(draft);
    onChange(resolve('custom', draft, new Date()));
  };

  const now = new Date();
  const minDateOnly = minAllowedDateOnly(now);
  const maxDateOnly = maxAllowedDateOnly(now);
  const trimmedDraft = customDraft.trim();
  const parsedDraft = trimmedDraft === '' ? undefined : dateOnlyToExpiresAt(trimmedDraft);
  const customUnparseable = preset === 'custom' && trimmedDraft !== '' && parsedDraft === undefined;
  const customOutOfRange =
    preset === 'custom' &&
    parsedDraft !== undefined &&
    !isExpiresAtWithinAllowedRange(parsedDraft, now);
  const customErrorMessage = customUnparseable
    ? t('apiKeys.expiry.customDateInvalid')
    : customOutOfRange
      ? t('apiKeys.expiry.customDateOutOfRange', { maxDays: EXPIRY_MAX_DAYS })
      : undefined;

  return (
    <Stack gap="sm" width="full">
      {label ? <Text intent="bodyStrong">{label}</Text> : null}
      <SegmentedControl
        width="full"
        options={options}
        value={preset}
        onChange={handlePresetChange}
        accessibilityLabel={t('apiKeys.expiry.label')}
      />
      {preset === 'custom' ? (
        <FormField label={t('apiKeys.expiry.customDateLabel')} error={customErrorMessage}>
          <DateField
            value={customDraft}
            onValueChange={handleDraftChange}
            min={minDateOnly}
            max={maxDateOnly}
            disabled={disabled}
            accessibilityLabel={t('apiKeys.expiry.customDateLabel')}
          />
        </FormField>
      ) : null}
    </Stack>
  );
}

export type { ExpiryDurationPreset, ExpiryPresetKey };
