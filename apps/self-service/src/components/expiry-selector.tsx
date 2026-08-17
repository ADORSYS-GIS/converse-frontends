import React, { useEffect, useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { DateField, FormField, SegmentedControl, Stack, Text } from '@lightbridge/ui';

import {
  EXPIRY_PRESET_DAYS,
  EXPIRY_PRESET_ORDER,
  dateOnlyToExpiresAt,
  expiresAtToDateOnly,
  presetToExpiresAt,
} from '../lib/api-key-expiry';
import type { ExpiryDurationPreset, ExpiryPresetKey } from '../lib/api-key-expiry';

/** Derives which preset an existing `expiresAt` should show as selected on mount: unset starts
 * on "No expiry"; any set value starts on "Custom" pre-filled with that exact date. There is no
 * way to tell from a stored `expiresAt` alone whether it was originally set via a duration
 * preset or a specific date, so re-showing it as "Custom" is the only choice that doesn't
 * silently round an existing key's real expiration when its settings screen re-opens it. */
function initialPresetFor(expiresAt?: string | null): ExpiryPresetKey {
  return expiresAt ? 'custom' : 'noExpiry';
}

function resolve(
  preset: ExpiryPresetKey,
  customDraft: string,
  now: Date
): string | null | undefined {
  if (preset === 'noExpiry') return null;
  if (preset === 'custom') {
    return customDraft.trim() === '' ? undefined : dateOnlyToExpiresAt(customDraft);
  }
  return presetToExpiresAt(EXPIRY_PRESET_DAYS[preset], now);
}

export type ExpirySelectorProps = {
  /**
   * Seeds the initial preset/custom-date UI, read once on mount: `undefined` defaults to the
   * 30-day preset (a fresh create form); an ISO datetime seeds "Custom" pre-filled with that
   * date; `null` seeds "No expiry" (an existing key with no expiration).
   *
   * Only read once -- callers that need to reset this when switching to a different key (e.g.
   * the settings screen's key picker) should remount via `key={apiKey?.id}` rather than push
   * updated props into an already-mounted selector.
   */
  initialValue?: string | null;
  /** Fires on every user interaction with the resolved value: an ISO datetime, `null` for "no
   * expiry", or `undefined` while "Custom" holds an incomplete/invalid date (callers should
   * block Save on `undefined`, the same convention used elsewhere in this app). */
  onChange: (value: string | null | undefined) => void;
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
    onChange(resolve(preset, customDraft, new Date()));
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
    noExpiry: t('apiKeys.expiry.noExpiry'),
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

  const todayDateOnly = expiresAtToDateOnly(new Date().toISOString());
  const customInvalid =
    preset === 'custom' &&
    customDraft.trim() !== '' &&
    dateOnlyToExpiresAt(customDraft) === undefined;

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
        <FormField
          label={t('apiKeys.expiry.customDateLabel')}
          error={customInvalid ? t('apiKeys.expiry.customDateInvalid') : undefined}>
          <DateField
            value={customDraft}
            onValueChange={handleDraftChange}
            min={todayDateOnly}
            disabled={disabled}
            accessibilityLabel={t('apiKeys.expiry.customDateLabel')}
          />
        </FormField>
      ) : null}
    </Stack>
  );
}

export type { ExpiryDurationPreset, ExpiryPresetKey };
