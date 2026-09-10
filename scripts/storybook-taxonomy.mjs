#!/usr/bin/env node
/**
 * Storybook taxonomy codemod + guard.
 *
 * The sidebar had grown flat and inconsistent: three sibling roots for what are all primitives
 * (`Forms & actions/`, `Data display/`, `Components/`, `States/`), a single `Sections/` bucket
 * holding 40 unrelated screens, a single `Pages/` bucket holding 26, and two one-off roots
 * (`Panels`, `Refine/`). Owner directive 2026-09-03: "re-organize the Storybook into better and
 * smaller folders, and include the LCI samples too."
 *
 * This script owns the one-time rename (`--apply`) and, more importantly, the ongoing guard
 * (`--check`, also asserted by `packages/ui-web/src/story-taxonomy.test.ts`): every story title
 * must sit under one of `TAXONOMY_ROOTS`, and no two stories may share a title — Storybook
 * silently merges duplicate titles into one sidebar entry, so a duplicate does not fail a build,
 * it just makes a story disappear.
 *
 *   node scripts/storybook-taxonomy.mjs --check    # assert; exit 1 on a violation
 *   node scripts/storybook-taxonomy.mjs --apply    # rewrite `title:` per RENAMES
 *
 * `--apply` is idempotent: a title already on its new value is simply not in `RENAMES` as a key.
 * Once the rename has landed the map is dead weight for the codemod but live documentation of
 * where every story moved, so it stays.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repo root, derived from this file's own location.
 *
 * Lazy and guarded, not a module-level constant: `packages/ui-web/src/story-taxonomy.test.ts`
 * imports this module through vitest, whose transform can hand `import.meta.url` back as a
 * non-`file:` URL — `fileURLToPath` then throws at import time and takes the whole suite with it.
 * Every exported function takes the root as an argument anyway; this is only the CLI's default.
 */
function repoRoot() {
  try {
    return join(fileURLToPath(new URL('.', import.meta.url)), '..');
  } catch {
    return process.cwd();
  }
}

/** Where stories live. `apps/lci` is a story root too — its screens are app-local by ADR 0014
 *  and are NOT moving into `ui-web`; `packages/ui-web/.storybook/main.ts` globs both trees. */
const STORY_ROOTS = ['packages/ui-web/src', 'apps/lci/src'];

/** The sidebar's top level, in the order `preview.tsx`'s `storySort` renders it. */
export const TAXONOMY_ROOTS = [
  'Foundations',
  'Primitives',
  'Charts',
  'Shell',
  'Dashboard',
  'Sections',
  'Pages',
  'LCI',
  'Legacy',
];

/** old title -> new title. Anything not listed is asserted to already be conformant. */
const RENAMES = {
  // Primitives/Actions -- things a person clicks or types into that carry no domain meaning.
  'Forms & actions/Button': 'Primitives/Actions/Button',
  'Forms & actions/Checkbox': 'Primitives/Actions/Checkbox',
  'Forms & actions/Toggle': 'Primitives/Actions/Toggle',
  'Forms & actions/SegmentedControl': 'Primitives/Actions/SegmentedControl',
  'Forms & actions/CommandSnippet': 'Primitives/Actions/CommandSnippet',
  'Forms & actions/SecretReveal': 'Primitives/Actions/SecretReveal',
  'Data display/RowActionGroup': 'Primitives/Actions/RowActionGroup',

  // Primitives/Fields
  'Forms & actions/Field': 'Primitives/Fields/Field',
  'Forms & actions/SelectField': 'Primitives/Fields/SelectField',
  'Forms & actions/ScopeSelect': 'Primitives/Fields/ScopeSelect',
  'Components/DateRangeField': 'Primitives/Fields/DateRangeField',

  // Primitives/Overlays -- anything that renders over the page, plus the panels that are only
  // ever a dialog's body (`ReportExportPanel`, `ReviewDetailPanel`).
  'Forms & actions/ConfirmDialog': 'Primitives/Overlays/ConfirmDialog',
  'Forms & actions/TypedConfirmDialog': 'Primitives/Overlays/TypedConfirmDialog',
  'Forms & actions/AccountNameDialog': 'Primitives/Overlays/AccountNameDialog',
  'Forms & actions/ProjectNameDialog': 'Primitives/Overlays/ProjectNameDialog',
  'Forms & actions/CreateApiKeyDialog': 'Primitives/Overlays/CreateApiKeyDialog',
  'Forms & actions/CreateProjectDialog': 'Primitives/Overlays/CreateProjectDialog',
  'Forms & actions/ReportExportDialog': 'Primitives/Overlays/ReportExportDialog',
  'Forms & actions/ReportExportPanel': 'Primitives/Overlays/ReportExportPanel',
  'Forms & actions/ReviewDetailPanel': 'Primitives/Overlays/ReviewDetailPanel',
  'Forms & actions/CommandPalette': 'Primitives/Overlays/CommandPalette',
  'Components/Tooltip': 'Primitives/Overlays/Tooltip',
  'Shell/BottomSheet': 'Primitives/Overlays/BottomSheet',

  // Primitives/Data -- reads a value out, takes no input.
  'Data display/Card': 'Primitives/Data/Card',
  'Data display/LedgerTable': 'Primitives/Data/LedgerTable',
  'Data display/StatCard': 'Primitives/Data/StatCard',
  'Data display/BudgetHero': 'Primitives/Data/BudgetHero',
  'Data display/Meter': 'Primitives/Data/Meter',
  'Data display/Pagination': 'Primitives/Data/Pagination',
  'Data display/SettingsRow': 'Primitives/Data/SettingsRow',
  'Data display/StatusText': 'Primitives/Data/StatusText',
  'Data display/Sparkline': 'Primitives/Data/Sparkline',
  'Components/AccountBadge': 'Primitives/Data/AccountBadge',

  // Primitives/States -- the empty/loading/error vocabulary, together so they read as one set.
  'States/EmptyState': 'Primitives/States/EmptyState',
  'States/ErrorLine': 'Primitives/States/ErrorLine',
  'States/InlineStatus': 'Primitives/States/InlineStatus',
  'States/MutationFailureBanner': 'Primitives/States/MutationFailureBanner',
  'States/SkeletonRow': 'Primitives/States/SkeletonRow',
  'States/SkeletonMetric': 'Primitives/States/SkeletonMetric',

  // Charts -- `ShareBar` is a chart mark (`panel-renderers.tsx` draws it for the `share` panel
  // type), not a generic component; it was only under `Components/` by accident of age.
  'Components/ShareBar': 'Charts/ShareBar',

  // Shell -- the persistent chrome. `ConsoleSidebar`/`PageHeader` live in `sections/` on disk but
  // are chrome, not screen content, so they read here.
  'Sections/ConsoleSidebar': 'Shell/ConsoleSidebar',
  'Sections/PageHeader': 'Shell/PageHeader',

  // Dashboard -- the declarative engine (ADR 0015): grid, panel frame, the renderer registry, and
  // the story that draws a real `dashboards.yaml` page.
  'Sections/DashboardGrid': 'Dashboard/DashboardGrid',
  'Sections/DashboardPanel': 'Dashboard/DashboardPanel',
  Panels: 'Dashboard/PanelRenderers',
  'Pages/FromSpec': 'Dashboard/FromSpec',

  // Sections/Account
  'Sections/AccountDirectory': 'Sections/Account/AccountDirectory',
  'Sections/AccountSettings': 'Sections/Account/AccountSettings',
  'Sections/ProjectDetail': 'Sections/Account/ProjectDetail',
  'Sections/ProjectSettings': 'Sections/Account/ProjectSettings',
  'Sections/ProjectsLedger': 'Sections/Account/ProjectsLedger',
  'Sections/ProjectPolicyControls': 'Sections/Account/ProjectPolicyControls',
  'Sections/ManageControls': 'Sections/Account/ManageControls',
  'Sections/ApiKeysLedger': 'Sections/Account/ApiKeysLedger',
  'Sections/ApiKeysControls': 'Sections/Account/ApiKeysControls',
  'Sections/ApiKeysHygieneNotes': 'Sections/Account/ApiKeysHygieneNotes',

  // Sections/Auth -- rendered by apps/authz-ui, not the console; the CSP-safe set
  // (`csp-safe-sections.test.ts`) is exactly this folder plus `AuthScreen`.
  'Sections/AuthScreen': 'Sections/Auth/AuthScreen',
  'Sections/AuthPanelShell': 'Sections/Auth/AuthPanelShell',
  'Sections/AuthErrorPanel': 'Sections/Auth/AuthErrorPanel',
  'Sections/DeviceCodeEntry': 'Sections/Auth/DeviceCodeEntry',
  'Sections/DeviceConfirmation': 'Sections/Auth/DeviceConfirmation',

  // Sections/Budget
  'Sections/BudgetPanel': 'Sections/Budget/BudgetPanel',
  'Sections/BudgetPressure': 'Sections/Budget/BudgetPressure',
  'Sections/EstateBudgetPressure': 'Sections/Budget/EstateBudgetPressure',
  'Sections/BudgetScheduleForm': 'Sections/Budget/BudgetScheduleForm',
  'Sections/BudgetSchedulePreview': 'Sections/Budget/BudgetSchedulePreview',

  // Sections/Admin -- the platform-operator surface (refills, roles, sessions, policy).
  'Sections/RefillHistory': 'Sections/Admin/RefillHistory',
  'Sections/RefillPolicyLookup': 'Sections/Admin/RefillPolicyLookup',
  'Sections/RefillPolicyManual': 'Sections/Admin/RefillPolicyManual',
  'Sections/RefillPolicyStatusStrip': 'Sections/Admin/RefillPolicyStatusStrip',
  'Sections/RefillRequestForm': 'Sections/Admin/RefillRequestForm',
  'Sections/ScenarioForm': 'Sections/Admin/RefillScenarioForm',
  'Sections/RuleSetForm': 'Sections/Admin/RuleSetForm',
  'Sections/ReviewQueue': 'Sections/Admin/ReviewQueue',
  'Sections/PolicySimulator': 'Sections/Admin/PolicySimulator',
  'Sections/PlatformRoleGrants': 'Sections/Admin/PlatformRoleGrants',
  'Sections/SessionLedger': 'Sections/Admin/SessionLedger',

  // Sections/Usage -- spend and latency zones, wherever they are mounted.
  'Sections/SpendDashboard': 'Sections/Usage/SpendDashboard',
  'Sections/SpendShareSection': 'Sections/Usage/SpendShareSection',
  'Sections/MultiSeriesSpendBoard': 'Sections/Usage/MultiSeriesSpendBoard',
  'Sections/RankedSeriesRows': 'Sections/Usage/RankedSeriesRows',
  'Sections/LatencyStatCards': 'Sections/Usage/LatencyStatCards',
  'Sections/OverviewStatRow': 'Sections/Usage/OverviewStatRow',
  'Sections/OverviewControls': 'Sections/Usage/OverviewControls',

  // Sections/Settings
  'Sections/BuildInfoCard': 'Sections/Settings/BuildInfoCard',

  // Pages/Account -- the account-scoped routes a normal user opens.
  'Pages/Overview': 'Pages/Account/Overview',
  'Pages/ApiKeys': 'Pages/Account/ApiKeys',

  // Pages/Admin -- `/admin/*`. The `Admin` prefix moves from the leaf into the folder.
  'Pages/AdminOverview': 'Pages/Admin/Overview',
  'Pages/AdminUsage': 'Pages/Admin/Usage',
  'Pages/AdminUsageActor': 'Pages/Admin/UsageByActor',
  'Pages/AdminUsageChannel': 'Pages/Admin/UsageByChannel',
  'Pages/AdminUsageChats': 'Pages/Admin/UsageByChat',
  'Pages/AdminUsageModel': 'Pages/Admin/UsageByModel',
  'Pages/AdminSessions': 'Pages/Admin/Sessions',
  'Pages/AdminRoles': 'Pages/Admin/Roles',
  'Pages/AdminBudgetReview': 'Pages/Admin/BudgetReview',
  'Pages/AdminBudgetSchedules': 'Pages/Admin/BudgetSchedules',
  'Pages/AdminRefillPolicies': 'Pages/Admin/RefillPolicies',
  'Pages/AdminRefillPoliciesCreate': 'Pages/Admin/RefillPolicyCreate',

  // Pages/Auth
  'Pages/AuthDevice': 'Pages/Auth/Device',
  'Pages/AuthError': 'Pages/Auth/Error',

  // Pages/Settings -- three of the six were already nested; the other three now match.
  'Pages/SettingsOverview': 'Pages/Settings/Overview',
  'Pages/SettingsOverviewUsage': 'Pages/Settings/OverviewUsage',
  'Pages/SettingsInfo': 'Pages/Settings/Info',

  // Pages/Platform -- cross-cutting page stories that are about the app, not one screen.
  'Pages/ShellPersistence': 'Pages/Platform/ShellPersistence',
  'Pages/I18n Deutsch': 'Pages/Platform/I18nGerman',

  // Legacy -- the refine-mock harness. #472 classifies `src/refine-mock/` as class B (referenced
  // only by its own stories) but the OWNER HAS NOT RULED ON DELETION, so nothing is deleted here:
  // the four screens move under `Legacy/` so the live tree reads clean while the decision is open.
  'Refine/Overview': 'Legacy/Refine/Overview',
  'Refine/Projects': 'Legacy/Refine/Projects',
  'Refine/ApiKeys': 'Legacy/Refine/ApiKeys',
  'Refine/AdminBudgetReview': 'Legacy/Refine/AdminBudgetReview',
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.stories\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

export function storyFiles(root = repoRoot()) {
  return STORY_ROOTS.flatMap((storyRoot) => {
    try {
      return walk(join(root, storyRoot));
    } catch {
      return []; // a root that does not exist yet is not an error
    }
  }).sort();
}

/**
 * The meta `title` of one story file.
 *
 * NOT simply the first `title:` in the file: story files carry `title:` inside fixtures and args
 * too (a person's name in `admin-usage-actor`'s actor fixture, a dialog's own heading in
 * `report-export-dialog`), and several of those are declared ABOVE the meta. So this anchors on
 * the `const meta` declaration and takes the first single-quoted `title:` after it — which is the
 * taxonomy one. A file with no `const meta` returns null and is reported as a violation.
 */
export function readTitle(file) {
  const source = readFileSync(file, 'utf8');
  const metaAt = source.search(/\bconst meta\b/);
  if (metaAt === -1) return null;
  const match = source.slice(metaAt).match(/^\s*title: '([^']*)',?$/m);
  return match ? match[1] : null;
}

function apply() {
  let changed = 0;
  for (const file of storyFiles()) {
    const title = readTitle(file);
    if (!title || !(title in RENAMES)) continue;
    const source = readFileSync(file, 'utf8');
    // Rewrite inside the `const meta` slice only, and only its first occurrence -- never a
    // fixture that happens to carry the same string.
    const metaAt = source.search(/\bconst meta\b/);
    const next =
      source.slice(0, metaAt) +
      source.slice(metaAt).replace(`title: '${title}'`, `title: '${RENAMES[title]}'`);
    if (next === source) continue;
    writeFileSync(file, next);
    console.log(`  ${relative(repoRoot(), file)}\n    ${title}  ->  ${RENAMES[title]}`);
    changed += 1;
  }
  console.log(`\n${changed} story file(s) retitled.`);
}

export function violations(root = repoRoot()) {
  const problems = [];
  const seen = new Map();
  for (const file of storyFiles(root)) {
    const short = relative(root, file);
    const title = readTitle(file);
    if (!title) {
      problems.push(`${short}: no \`title:\` on its meta — every story file must declare one.`);
      continue;
    }
    const titleRoot = title.split('/')[0];
    if (!TAXONOMY_ROOTS.includes(titleRoot)) {
      problems.push(
        `${short}: title '${title}' is under '${titleRoot}', which is not a taxonomy root ` +
          `(${TAXONOMY_ROOTS.join(', ')}). See packages/ui-web/STORYBOOK.md.`
      );
    }
    if (seen.has(title)) {
      problems.push(
        `${short}: title '${title}' is already used by ${seen.get(title)}. ` +
          'Storybook merges duplicate titles into one sidebar entry — one of the two would vanish.'
      );
    } else {
      seen.set(title, short);
    }
  }
  return problems;
}

function check() {
  const problems = violations();
  const total = storyFiles().length;
  if (problems.length === 0) {
    console.log(`${total} story files, ${total} distinct titles, all under the taxonomy. OK.`);
    return;
  }
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exitCode = 1;
}

const mode = process.argv[2];
if (mode === '--apply') apply();
else if (mode === '--check') check();
else if (import.meta.url === `file://${process.argv[1]}`) {
  console.error('usage: node scripts/storybook-taxonomy.mjs --check | --apply');
  process.exitCode = 2;
}
