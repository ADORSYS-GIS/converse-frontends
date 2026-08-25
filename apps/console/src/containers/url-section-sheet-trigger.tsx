'use client';

import { SectionSheetTrigger } from '@lightbridge/ui-web/src/components/section-sheet-trigger';
import type { SectionSheetTriggerProps } from '@lightbridge/ui-web/src/components/section-sheet-trigger';

import { useSectionSheetParam, type SectionSheetId } from '../client/url-state';

/**
 * `SectionSheetTrigger`, bound to the console's `?sheet=` param (ADR 0011).
 *
 * Below `lg` the right rail is not rendered and each of its sections is reached through one of
 * these contextual triggers. *Which section is open* is view state — it is part of what the user
 * is looking at — so it lives in the URL like everything else: `/manage?sheet=filters&status=active`
 * opens for a colleague with the filter panel already in front of them, Back closes the sheet
 * rather than leaving the screen, and a reload does not silently drop the panel the user had open.
 *
 * One param for the whole console because only one sheet can be open at a time; the `id` here is
 * the section's identity within its route, and `SECTION_SHEET_IDS` in `url-state.ts` is the
 * closed vocabulary. `history: 'replace'` (set on the parser) keeps a sheet's open/close cycle
 * from costing a history entry each way.
 *
 * The `open`/`onOpenChange` pair this leans on is `ui-web`'s controlled form of an otherwise
 * uncontrolled convenience — the package stays free of nuqs (ADR 0011 Decision 4); this app-side
 * wrapper is where the URL meets it.
 */
export function UrlSectionSheetTrigger({
  id,
  ...props
}: { id: SectionSheetId } & Omit<SectionSheetTriggerProps, 'open' | 'onOpenChange'>) {
  const [sheet, setSheet] = useSectionSheetParam();

  return (
    <SectionSheetTrigger
      {...props}
      open={sheet === id}
      onOpenChange={(next) => {
        void setSheet(next ? id : null);
      }}
    />
  );
}
