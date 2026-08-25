import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';

/**
 * A single rail form-control's loading placeholder: `RailSelect`'s own geometry is a 10px label
 * over a 30px control (`packages/ui-web/src/components/rail-select/component.tsx`) — this matches
 * it exactly so a rail section's loading state occupies the same height its real fields will.
 *
 * console-ui skill §states: "skeleton blocks (`raised`) matching final geometry ... No spinners,
 * no shimmer" — used by every `@rail`/`@scope` `loading.tsx` for the sections that need live data
 * (account/project lists, filter values) the static loading render has no access to. Sections that
 * are static regardless of load state (`ApiKeysLifecycleRail`) or whose empty state already equals
 * their loading appearance (`ManageSelectionRail`/`ReviewDetailRail` with no selection) render
 * their real component directly instead — see the `loading.tsx` files that use this.
 */
function RailFieldSkeleton() {
  return (
    <div className="flex flex-col gap-1.5" role="presentation" aria-hidden="true">
      <span className="h-[10px] w-16 rounded-[2px] bg-raised" />
      <span className="h-[30px] w-full rounded-[2px] bg-raised" />
    </div>
  );
}

/** A `RailPanel` carrying `fieldCount` `RailFieldSkeleton`s, gapped like the real field sections. */
export function RailPanelSkeleton({ label, fieldCount = 2 }: { label?: string; fieldCount?: number }) {
  return (
    <RailPanel label={label}>
      <div className="flex flex-col gap-4">
        {Array.from({ length: fieldCount }, (_, index) => (
          <RailFieldSkeleton key={index} />
        ))}
      </div>
    </RailPanel>
  );
}

// Deterministic, varied widths (never randomised — a loading state must be visually stable across
// renders) — same reasoning as `SkeletonRow`'s own `SKELETON_BLOCK_WIDTHS`.
const TEXT_LINE_WIDTHS = ['85%', '70%', '55%'];

/**
 * A `RailPanel` of plain 11px text-line placeholders — for sections that show a handful of
 * read-only, conditionally-present lines (e.g. `ApiKeysHygieneRail`'s expiring/never-used/revoked
 * counts) rather than form controls, so `RailFieldSkeleton`'s label+control shape would not match.
 */
export function RailTextSkeleton({ label, lineCount = 2 }: { label?: string; lineCount?: number }) {
  return (
    <RailPanel label={label}>
      <div className="flex flex-col gap-2" role="presentation" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => (
          <span
            key={index}
            className="h-[11px] rounded-[2px] bg-raised"
            style={{ width: TEXT_LINE_WIDTHS[index % TEXT_LINE_WIDTHS.length] }}
          />
        ))}
      </div>
    </RailPanel>
  );
}
