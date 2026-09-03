// The `de` acceptance surface for ADR 0017 — the console shell and one admin page, rendered from
// the SHIPPED German bundles rather than from strings retyped here.
//
// Why the real bundles and not fixtures: a story that restated the German copy would certify
// wording nobody ships, and would keep certifying it after the bundle changed. These import
// `apps/console/locales/de/*.json` directly — the same DATA import `spec-page.tsx` already makes
// for `dashboards.yaml` (see `src/vite-raw-imports.d.ts`), so the package dependency direction is
// unchanged: no `apps/console` CODE is imported here, and `packages/ui-web` still owns no
// translations of its own (ADR 0017 D3).
//
// What this proves, and what it does not. It proves the chrome and a page HEADER read correctly in
// German at both themes, and that `CopyProvider` reaches the primitives that carry their own copy
// (`Pagination`'s caption, `ErrorLine`'s retry, `BottomSheet`'s close). It does NOT prove the
// ledger's own column headers are translated — they are not: `packages/ui-web`'s remaining English
// defaults are named follow-up work in the ADR, and a story pretending otherwise would be the
// dishonest kind.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import deCommon from '../../../../apps/console/locales/de/common.json';
import deNav from '../../../../apps/console/locales/de/nav.json';
import deAdmin from '../../../../apps/console/locales/de/admin.json';

import { AccountBadge } from '../components/account-badge';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { ConsoleTopBar } from '../components/console-top-bar';
import { SelectField } from '../components/select-field';
import { ThemeToggle } from '../components/theme-toggle';
import type { ThemeTogglePreference } from '../components/theme-toggle';
import type { NavGroup } from '../components/nav-spine';
import { CopyProvider, type UiCopy } from '../lib/copy';
import {
  AccountsIcon,
  AdminIcon,
  KeysIcon,
  OverviewIcon,
  RolesIcon,
  SearchIcon,
  SessionsIcon,
  SettingsIcon,
  SignOutIcon,
  UsageIcon,
} from '../lib/icons';
import { RAIL_ICON_COLUMN_CLASS } from '../lib/rail-grid';
import { ConsoleSidebar } from '../sections/console-sidebar';
import { PageHeader } from '../sections/page-header';
import { SessionLedger } from '../sections/session-ledger';
import { sessionRowsFixture } from '../sections/session-ledger/fixtures';
import { STORY_ACCOUNT_ID, storyBrand } from './shell-fixtures';

/**
 * The German values `apps/console`'s `ConsoleCopyProvider` fills `UiCopy` with — read from the
 * same `common` bundle it reads, so this cannot drift from what the console actually renders.
 *
 * `locale: 'de'` is the load-bearing one: it switches the ambient money notation, so every figure
 * in these stories reads `1.131,80 $` rather than `$1 131.80` (ADR 0017 D5).
 */
const GERMAN_COPY: Partial<UiCopy> = {
  locale: 'de',
  retry: deCommon.actions.retry,
  of: deCommon.money.of,
  paginationShowingOfTotal: deCommon.pagination['showing-of-total'],
  paginationPerPage: deCommon.pagination['per-page'],
  paginationCount: deCommon.pagination.count,
  paginationPrevious: deCommon.pagination.previous,
  paginationNext: deCommon.pagination.next,
  expandPanel: deCommon.actions['expand-panel'],
  close: deCommon.actions.close,
};

/** The ACCOUNT area's rail, in German — `navGroups`' own three groups
 *  (`apps/console/src/client/console-chrome.tsx`), with the same icons production draws. */
function germanAccountNav(): NavGroup[] {
  return [
    {
      key: 'workspace',
      label: deNav.group.workspace,
      items: [
        { key: 'overview', label: deNav.item.overview, icon: <OverviewIcon />, active: true },
        { key: 'api-keys', label: deNav.item['api-keys'], icon: <KeysIcon /> },
      ],
    },
    {
      key: 'account',
      label: deNav.group.account,
      items: [{ key: 'settings', label: deNav.item.settings, icon: <SettingsIcon /> }],
    },
    {
      key: 'operator',
      label: deNav.group.operator,
      items: [{ key: 'admin', label: deNav.item.admin, icon: <AdminIcon /> }],
    },
  ];
}

/** The ADMIN area's rail, in German — the same replacement `ConsoleSidebarContent` performs when
 *  `areaFromPathname(pathname) === 'admin'`, trimmed to the destinations this story's caller can
 *  reach. */
function germanAdminNav(): NavGroup[] {
  return [
    {
      key: 'admin',
      items: [
        { key: 'overview', label: deNav.item.overview, icon: <OverviewIcon /> },
        { key: 'usage', label: deNav.item.usage, icon: <UsageIcon /> },
        { key: 'accounts', label: deNav.item.accounts, icon: <AccountsIcon /> },
        { key: 'sessions', label: deNav.item.sessions, icon: <SessionsIcon />, active: true },
        { key: 'roles', label: deNav.item.roles, icon: <RolesIcon /> },
      ],
    },
  ];
}

/** The footer stack, in German — Search, Theme and the LANGUAGE row ADR 0017 adds directly under
 *  it, then the identity row. The language control is a `SelectField` (owner directive 2026-09-03:
 *  "Language selection should be a dropdown" — it was a `SegmentedControl` until then, a strip
 *  whose width grows with every locale added), `layout="inline"` so the trigger sizes to its own
 *  content in the row's trailing slot and `hideLabel` so the visible row label is the only one a
 *  reader sees while the control still carries a real accessible name. The option labels are
 *  endonyms ("English"/"Deutsch"), which is deliberate: a reader who landed in a language they
 *  cannot read has to recognise their own language's name in the control. */
function GermanFooter() {
  const [preference, setPreference] = useState<ThemeTogglePreference>('black');
  const [locale, setLocale] = useState<'en' | 'de'>('de');

  return (
    <>
      <button type="button" className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
          <SearchIcon />
        </span>
        <span className="text-subtle font-sans text-[13px]">{deNav.footer.search}</span>
        <kbd className="kbd kbd-sm ml-auto">⌘K</kbd>
      </button>
      <div className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
        <span className="text-subtle font-sans text-[13px]">{deNav.footer.theme}</span>
        <ThemeToggle
          preference={preference}
          onPreferenceChange={setPreference}
          className="ml-auto"
        />
      </div>
      <div className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS} />
        <span className="text-subtle font-sans text-[13px]">{deCommon.language.label}</span>
        <SelectField
          label={deCommon.language.label}
          hideLabel
          layout="inline"
          options={[
            { value: 'en', label: deCommon.language.en },
            { value: 'de', label: deCommon.language.de },
          ]}
          value={locale}
          onChange={(next) => setLocale(next as 'en' | 'de')}
          className="ml-auto"
        />
      </div>
      <div className="sidebar-footer-row">
        <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
          <span aria-hidden="true" className="avatar-chip-sm">
            SL
          </span>
        </span>
        <span className="rail-row-label text-soft text-[13px]">Sam Lambou</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={deNav.footer['sign-out']}
          className="ml-auto">
          <SignOutIcon />
        </Button>
      </div>
    </>
  );
}

function germanSidebar(groups: NavGroup[]) {
  return (
    <ConsoleSidebar
      brand={storyBrand}
      workspaceSwitcher={
        <AccountBadge
          variant="sidebar"
          initials="AG"
          name="adorsys-gis"
          accountId={STORY_ACCOUNT_ID}
          onCopyId={() => {}}
          onCreateAccount={() => {}}
        />
      }
      groups={groups}
      footer={<GermanFooter />}
    />
  );
}

function germanTopBar() {
  return (
    <ConsoleTopBar
      brand={storyBrand}
      workspaceSwitcher={
        <AccountBadge
          name="adorsys-gis"
          accountId={STORY_ACCOUNT_ID}
          onCopyId={() => {}}
          onCreateAccount={() => {}}
        />
      }
      trailing={<ThemeToggle preference="black" onPreferenceChange={() => {}} />}
    />
  );
}

const meta: Meta = {
  title: 'Pages/Platform/I18nGerman',
  parameters: { layout: 'fullscreen' },
};
export default meta;

/**
 * The shell itself: the account area's rail in German, with the Language row under Theme.
 *
 * The centre column is deliberately near-empty — this story is about the CHROME, and a page's own
 * content would be the thing a reviewer looked at instead.
 */
export const Shell: StoryObj = {
  render: () => (
    <CopyProvider copy={GERMAN_COPY}>
      <ConsoleShell sidebar={germanSidebar(germanAccountNav())} topBar={germanTopBar()}>
        <div className="flex flex-col gap-6">
          <PageHeader
            title={deNav.item.overview}
            subtitle={`adorsys-gis · ${deCommon.range.mtd} · ${deCommon.timezone.utc}`}
          />
        </div>
      </ConsoleShell>
    </CopyProvider>
  ),
};

/**
 * `/admin/sessions` in German — the admin rail replacing the account one, the page header's own
 * pluralised subtitle (`sessions.subtitle_other`, i18next's plural resolution rather than a
 * hand-appended `s`), and the ledger's pager caption coming through `CopyProvider`.
 *
 * The ledger's COLUMN headers are still English, and that is the honest state: they are
 * `packages/ui-web` defaults, listed in ADR 0017's "What is not translated yet".
 */
export const AdminSessions: StoryObj = {
  render: () => (
    <CopyProvider copy={GERMAN_COPY}>
      <ConsoleShell sidebar={germanSidebar(germanAdminNav())} topBar={germanTopBar()}>
        <div className="flex flex-col gap-6">
          <PageHeader
            title={deAdmin.sessions.title}
            subtitle={deAdmin.sessions.subtitle_other.replace(
              '{{count}}',
              String(sessionRowsFixture.length)
            )}
          />
          <Card>
            <SessionLedger
              sessions={sessionRowsFixture}
              emptyMessage={deAdmin.sessions.empty['no-active']}
              selectedSessionId={null}
              onSelectSession={() => {}}
              pagination={{
                shown: sessionRowsFixture.length,
                pageSize: 25,
                hasPrev: false,
                hasNext: true,
                onPrev: () => {},
                onNext: () => {},
              }}
            />
          </Card>
        </div>
      </ConsoleShell>
    </CopyProvider>
  ),
};

/**
 * The same shell with a FAILED panel, so the two primitives that carry their own copy are visible
 * in German at once: `ErrorLine`'s retry word and the pager's caption, both from `CopyProvider`
 * rather than from a prop this story passes.
 */
export const AdminSessionsError: StoryObj = {
  render: () => (
    <CopyProvider copy={GERMAN_COPY}>
      <ConsoleShell sidebar={germanSidebar(germanAdminNav())} topBar={germanTopBar()}>
        <div className="flex flex-col gap-6">
          <PageHeader title={deAdmin.sessions.title} />
          <Card>
            <SessionLedger
              sessions={[]}
              error={deAdmin.sessions['load-failed']}
              onRetry={() => {}}
              emptyMessage={deAdmin.sessions.empty['no-active']}
              selectedSessionId={null}
              onSelectSession={() => {}}
            />
          </Card>
        </div>
      </ConsoleShell>
    </CopyProvider>
  ),
};
