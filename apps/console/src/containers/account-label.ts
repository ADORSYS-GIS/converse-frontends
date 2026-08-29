import { UNNAMED_ACCOUNT_LABEL } from '@lightbridge/ui-web/src/sections/account-panel';

/**
 * How an account is labelled everywhere it appears as a *choice* or a *heading* rather than as the
 * subject of `AccountPanel` — the scope picker's options, the header's org slot.
 *
 * `Account.name` is nullable and, today, usually `null`: it shipped with no truthful backfill
 * value (lightbridge-authz#551), so every account created before that migration reads back unnamed
 * until someone names it. Three renderings were possible and two are wrong:
 *
 *  - `name ?? id` silently substitutes the id for the name, which is the exact defect `name`
 *    exists to fix — a console then cannot tell "named `9f3a-…`" from "never named".
 *  - `name ?? ''` renders an empty option, which is unpickable and unreadable.
 *  - `name ?? "Unnamed account · <id>"` — this one. It names the absence AND keeps the id, which
 *    is still the only way to address the account, so the option stays selectable and unambiguous
 *    even with several unnamed accounts in the list.
 *
 * A named account shows only its name: the id is echoed by `AccountPanel` and the SCOPE rail, and
 * a picker that repeats it beside every entry is noise.
 *
 * Imported from `@lightbridge/ui-web/src/sections/account-panel` — the same constant the panel
 * renders — rather than re-declared here, so the two surfaces cannot drift apart.
 */
export function accountScopeLabel(account: { id: string; name?: string | null }): string {
  return account.name ?? `${UNNAMED_ACCOUNT_LABEL} · ${account.id}`;
}

export { UNNAMED_ACCOUNT_LABEL };
