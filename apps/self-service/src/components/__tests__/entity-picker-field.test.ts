import type { Project } from '@lightbridge/hooks';

import { getThemeColors } from '../../theme/theme-colors';
import { pickerTruncationNotice, toProjectPickerOptions } from '../entity-picker-field';

const colors = getThemeColors('light');

const project: Project = {
  id: 'proj-1',
  accountId: 'acc-1',
  name: 'production',
  billingPlan: 'free',
  billingIdentity: 'acme-inc',
  projectQuota: undefined,
  allowedModels: [],
  defaultLimits: { requests_per_second: null, requests_per_day: null, concurrent_requests: null },
  status: 'active',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('toProjectPickerOptions', () => {
  it('maps a well-formed project to a label matching its name', () => {
    expect(toProjectPickerOptions([project], undefined, colors)).toEqual([
      expect.objectContaining({ id: 'proj-1', label: 'production' }),
    ]);
  });

  /**
   * Regression test for the same crash class as `AccountSettingsView.defaultQuota` (production
   * incident, `TypeError: f.trim is not a function`) and `ProjectSettingsView.name`/`billingPlan`
   * (issue #188's own follow-up sweep): `Project.name` is declared non-nullable in the schema,
   * but that is a *compile-time* contract only -- the generated RPC client's `as Project` cast
   * (`packages/authz-rpc/generated/src/client.ts`) provides no runtime guarantee a decoded value
   * actually matches it. This mapper's `label` feeds straight into `PickerList`'s
   * `option.label.toLowerCase()` (`packages/ui/src/components/picker/component.tsx`) with no
   * guard of its own -- before this fix, a present-but-non-string `name` would sail through
   * unnoticed here (this function itself never touches `.toLowerCase()`) and only blow up later,
   * inside the picker sheet, the moment a user typed a search query. `as unknown as string`
   * simulates a wire value that violates its own declared type, exactly as it did in production.
   */
  it('coerces a non-string project name to "" instead of passing it through unguarded', () => {
    const malformedProject: Project = { ...project, name: 42 as unknown as string };
    expect(toProjectPickerOptions([malformedProject], undefined, colors)).toEqual([
      expect.objectContaining({ id: 'proj-1', label: '' }),
    ]);
  });
});

describe('pickerTruncationNotice', () => {
  it('returns the notice when the loaded count is less than the server total', () => {
    expect(pickerTruncationNotice(1000, 1247, 'Not everything could be loaded.')).toBe(
      'Not everything could be loaded.'
    );
  });

  it('returns undefined when the loaded count matches the server total (the normal case)', () => {
    expect(pickerTruncationNotice(12, 12, 'Not everything could be loaded.')).toBeUndefined();
  });

  it('returns undefined for an empty, complete list (0 loaded, 0 total)', () => {
    expect(pickerTruncationNotice(0, 0, 'Not everything could be loaded.')).toBeUndefined();
  });
});
