import { describe, expect, it } from 'vitest';

import { buildCreateProjectInput } from './build-create-project-input';

describe('buildCreateProjectInput', () => {
  it('maps the caller-provided fields onto the real CreateProjectInput shape', () => {
    const input = buildCreateProjectInput({
      id: 'proj_abc123',
      accountId: 'acct_01',
      name: 'widgets-prod',
      billingIdentity: 'widgets-prod-billing',
      billingPlan: 'pro',
    });

    expect(input).toMatchObject({
      id: 'proj_abc123',
      accountId: 'acct_01',
      name: 'widgets-prod',
      billingIdentity: 'widgets-prod-billing',
      billingPlan: 'pro',
    });
  });

  // authz.cstack:193-274 — none of these are settable through the generic create verb (each has
  // its own dedicated post-creation write path, or is a DB trigger); a brand-new project always
  // starts in exactly this state regardless of what this function sends for them.
  it('sends only inert placeholders for the @readonly fields — never a guessed real value', () => {
    const input = buildCreateProjectInput({
      id: 'proj_abc123',
      accountId: 'acct_01',
      name: 'widgets-prod',
      billingIdentity: 'widgets-prod-billing',
      billingPlan: 'pro',
    });

    expect(input.allowedModels).toBeNull();
    expect(input.modelPolicy).toBe('allow_all');
    expect(input.projectQuota).toBeNull();
    expect(input.isDefault).toBe(false);
    expect(input.status).toBe('active');
  });

  it('sends an empty defaultLimits object rather than inventing a shape nothing consumes', () => {
    const input = buildCreateProjectInput({
      id: 'proj_abc123',
      accountId: 'acct_01',
      name: 'widgets-prod',
      billingIdentity: 'widgets-prod-billing',
      billingPlan: 'pro',
    });

    expect(input.defaultLimits).toEqual({});
  });
});
