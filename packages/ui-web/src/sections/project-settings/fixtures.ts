// Projects as the backend actually returns them, matched field-for-field against
// `packages/authz-rpc/schema/authz.cstack`'s `model Project`.
//
// Deliberately not a prettied-up sample: the first row is an account's DEFAULT project (created by
// the `BEFORE INSERT` trigger, so it carries no quota tier and cannot be hard-deleted), the second
// is a fully-configured one, and the third is suspended with an `allowlist` model policy. Between
// them they cover every state a settings row can be in — including the two `null`s, which are the
// ordinary case rather than an edge one.
import type { ProjectSettingsRow } from './types';

export const projectSettingsFixture: ProjectSettingsRow[] = [
  {
    id: 'proj_7f21c0a4',
    name: 'gateway-prod',
    billingIdentity: 'adorsys-gis/gateway',
    billingPlan: 'pro',
    quotaTier: 'scale',
    modelPolicy: 'allow_all',
    status: 'active',
    isDefault: true,
  },
  {
    id: 'proj_b93e1d55',
    name: 'batch-eval',
    billingIdentity: 'adorsys-gis/research',
    billingPlan: 'free',
    // A brand-new project starts here and can only be given a tier afterwards, through
    // `setProjectQuota` — there is no create-time path for it.
    quotaTier: null,
    modelPolicy: 'allow_all',
    status: 'active',
    isDefault: false,
  },
  {
    id: 'proj_2c48af10',
    name: 'rag-catalogue',
    billingIdentity: 'widgets-ltd/rag',
    billingPlan: 'enterprise',
    quotaTier: 'growth',
    modelPolicy: 'allowlist',
    status: 'suspended',
    isDefault: false,
  },
];

export const defaultProjectFixture: ProjectSettingsRow = projectSettingsFixture[0];
export const untieredProjectFixture: ProjectSettingsRow = projectSettingsFixture[1];
export const suspendedProjectFixture: ProjectSettingsRow = projectSettingsFixture[2];
