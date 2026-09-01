import { UNNAMED_ACCOUNT_LABEL } from '@lightbridge/ui-web/src/sections/account-settings';
import { shortAccountId } from '@lightbridge/ui-web';

/**
 * How an account is labelled everywhere it appears **inline** — a *choice* or a *heading* rather
 * than as the subject of `AccountSettings` — the scope picker's options, `PageHeader.subtitle`,
 * the projects toolbar.
 *
 * `Account.name` is nullable and, today, usually `null`: it shipped with no truthful backfill
 * value (lightbridge-authz#551), so every account created before that migration reads back unnamed
 * until someone names it. This used to fall back to `"Unnamed account · <full-uuid>"`, which
 * printed a 36-character id inline everywhere a subtitle or select rendered it (live regression,
 * 2026-08-30 findings #2) — the exact "raw UUID as a visible label" the console-ui skill bans.
 * The fix mirrors `AccountBadge`'s own fallback (`shortAccountId` → `acct_<first8>`): short,
 * still-disambiguating between two unnamed accounts, and consistent with the sidebar workspace
 * chip's idiom. The full id stays available where identity is actually the point — the account
 * settings card's own `Account id` row, and the copy-id menu action — neither of which goes
 * through this function.
 *
 * A named account shows only its name: the id is echoed by `AccountSettings`, and a picker that
 * repeats it beside every entry is noise.
 *
 * `UNNAMED_ACCOUNT_LABEL` is imported from `@lightbridge/ui-web/src/sections/account-settings` —
 * the same constant the section renders — rather than re-declared here, so the two surfaces
 * cannot drift apart; it stays exported for call sites that want the long-form headline (e.g. the
 * account settings screen's own empty/unnamed state), not this inline label.
 */
export function accountScopeLabel(account: { id: string; name?: string | null }): string {
  return account.name ?? shortAccountId(account.id);
}

export { UNNAMED_ACCOUNT_LABEL };
