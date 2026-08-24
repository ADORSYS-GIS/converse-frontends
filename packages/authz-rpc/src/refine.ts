/**
 * The `--refine` codegen surface, re-exported as `@lightbridge/authz-rpc/refine`.
 *
 * `cratestack generate-typescript --refine` (see this package's `codegen` script) emits
 * `generated/src/refine.ts`: a `RpcResourceMap` binding each `@@paged` model in
 * `schema/authz.cstack` to its client API, `@id` field and `@version` field. It is the input to
 * `createCratestackRpcDataProvider()` from `@cratestack/refine`.
 *
 * Kept on its own subpath rather than in the package barrel on purpose: the barrel is imported by
 * `apps/self-service` (React Native), which has no refine dependency at all, and `generated/src/
 * refine.ts` type-imports `@cratestack/refine`.
 */
export { cratestackRefineResources, type CratestackRefineResource } from '../generated/src/refine';
