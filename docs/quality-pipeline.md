# Quality Pipeline Architecture & Operations

## Overview

The quality pipeline is an offline-capable code quality scanning system that replaces SonarQube CE's practical responsibilities without introducing a SaaS platform. It was originally designed to run entirely on self-hosted infrastructure (`adorsys-gis-runner`), with every scanner pre-provisioned on that runner's image; [#134](https://github.com/ADORSYS-GIS/converse-frontends/pull/134) (2026-07-31) moved `quality.yml` to GitHub-hosted `ubuntu-latest` along with every other workflow, and the pre-provisioning assumption did not move with it — see the **Known Gap** below before trusting the "pull request checks via reviewdog" claim.

**Key features (as designed):**

- ✅ No external scanning platforms or cloud services
- ✅ Pull request checks via GitHub Check API + reviewdog
- ✅ Preserved reports as CI artifacts
- ✅ Gradual adoption: only reports new findings on PRs
- ✅ Comprehensive SAST, linting, and maintainability checks

> **Known Gap — verified 2026-08-15, not yet fixed.** On the current `ubuntu-latest`
> runner, `quality.yml` never installs Semgrep, Hadolint, Actionlint, jscpd, or reviewdog —
> only ESLint, TypeScript, and Prettier actually run (they ship via `pnpm`/`node`, already
> installed for the rest of the job). Confirmed from a live `pull_request` run
> ([run 31891626188](https://github.com/ADORSYS-GIS/converse-frontends/actions/runs/31891626188),
> PR #167): `⊘ semgrep not found; skipping`, `⊘ hadolint not found; skipping`,
> `⊘ actionlint not found; skipping`, `⊘ jscpd not found; skipping`, and
> `reviewdog not found in PATH; skipping PR check` — on the PR-triggered run itself, not
> only the fork-PR degraded path the workflow anticipates. `run.sh` treats "tool not found"
> as `skipped`, not `error`, so `gate.sh` doesn't fail on this either. Net effect: **no
> scanner's findings can fail a PR check today** — not because `gate.sh` is lenient by
> design (it always was, see below) but because the one enforcement path that was supposed
> to catch new findings (reviewdog) is absent from the runner. This is documented in more
> detail, with real current numbers, in `docs/knowledge/ci-cd.md`'s Known Gaps section.

## Architecture

```
┌─────────────────────────────────────────────┐
│  GitHub Actions: quality.yml                │
│  (runs on GitHub-hosted ubuntu-latest)      │
└─────────────────────────────────────────────┘
                    │
       ┌────────────┼────────────┐
       │            │            │
    Trigger:     Push,        Dispatch
    PR, Main   Schedule
       │            │            │
       └────────────┼────────────┘
                    │
       ┌────────────▼─────────────────────────────────┐
       │  .ci/quality/run.sh (orchestrator)           │
       │  - Invokes each scanner independently        │
       │  - Captures individual SARIF outputs         │
       │  - Tolerates missing tools gracefully        │
       └────────────┬─────────────────────────────────┘
                    │
       ┌────────────┴──────────────────────────────────────────────────────┐
       │                                                                    │
       ▼          ▼           ▼           ▼            ▼          ▼        ▼
    ESLint   TypeScript   Prettier    Semgrep      Hadolint   Actionlint  jscpd
    ────────────────────────────────────────────────────────────────────────
    .json    .log         stdout    .sarif       .sarif      .json      .sarif
             (per-tsconfig)         (native)     (native)               (native)
       │          │           │         │            │           │        │
       └──────────┴───────────┴─────────┼────────────┴───────────┘        │
                              │         │                                 │
       ┌──────────────────────▼──────────────────────┐                    │
       │  Converters (Node.js, non-native tools only) │                    │
       │  - eslint-to-sarif.js                        │                    │
       │  - typescript-to-sarif.js                     │                    │
       │  - prettier-to-sarif.js                       │                    │
       │  - actionlint-to-sarif.js                     │                    │
       └──────────────────────┬──────────────────────┘                    │
                              │                                            │
                              └────────────────┬───────────────────────────┘
                                               │
       ┌──────────────────────▼──────────────────────┐
       │  .ci/quality/merge-sarif.sh                 │
       │  → Combines all SARIF into quality.sarif    │
       └──────────────────────┬──────────────────────┘
                              │
       ┌──────────────────────▼──────────────────────────────────┐
       │  .ci/quality/gate.sh                                    │
       │  - FAILS only on scanner execution/config errors        │
       │    (reads scanner-status.txt written by run.sh)         │
       │  - Prints repo-wide severity counts (informational      │
       │    only — never gates on them; that would fail every    │
       │    PR on the pre-existing backlog)                      │
       └──────────────────────┬──────────────────────────────────┘
                              │
       ┌──────────────────────┴───────────────────────┐
       │                                              │
       ▼                                              ▼
   GitHub Code Scanning          GitHub PR Checks (reviewdog)
   (optional, main branch)       -filter-mode=added -fail-on-error
                                 → the ONLY thing that fails a PR on
                                   findings, and only new ones
       └──────────────────────────────────────────────┘
```

Semgrep, Hadolint, and jscpd all emit SARIF **natively** — no converter
needed for them. ESLint, TypeScript, and Prettier have no built-in SARIF
output, so small Node.js scripts convert their native formats.

## Enabled Scanners & Replacements

### SAST (Static Application Security Testing)

| Scanner                 | What It Finds                                     | SonarQube CE Equivalent |
| ----------------------- | ------------------------------------------------- | ----------------------- |
| **ESLint**              | Linting violations, unsafe patterns, style issues | Built-in code smells    |
| **Semgrep**             | Security patterns, anti-patterns (custom rules)   | Custom rule engine      |
| **TypeScript Compiler** | Type errors, strict mode violations               | Type checking           |

**Output:** SARIF with `error` and `warning` levels.

### Linting & Formatting

| Tool         | What It Finds                                | SonarQube CE Equivalent |
| ------------ | -------------------------------------------- | ----------------------- |
| **Prettier** | Format violations (indentation, line length) | Code formatting rules   |
| **ESLint**   | Style, naming, best practices                | Built-in quality rules  |

**Output:** Violations mapped to SARIF `note` level.

### Infrastructure & Configuration

| Tool           | What It Finds                              | SonarQube CE Equivalent |
| -------------- | ------------------------------------------ | ----------------------- |
| **Hadolint**   | Dockerfile best practices, security issues | No direct equivalent    |
| **Actionlint** | GitHub Actions YAML validation             | No direct equivalent    |

**Output:** SARIF with `warning` level.

### Code Quality & Duplication

| Tool      | What It Finds                | SonarQube CE Equivalent |
| --------- | ---------------------------- | ----------------------- |
| **jscpd** | Copy-paste code, duplication | Duplication ratio       |

**Output:** SARIF with `note` level.

### **NOT Included** (Handled by Existing Pipelines)

- **Trivy**: Dependency & container scanning → `security.yml` (ai-ops shared)
- **Gitleaks**: Secret scanning → `security.yml` (ai-ops shared)

## Which SonarQube Capabilities Are Replaced

✅ **Replaced:**

- Code smell detection (ESLint + Semgrep)
- Security hotspot discovery (Semgrep + ESLint)
- Type/strictness checking (TypeScript)
- Code duplication (jscpd)
- Format/style violations (Prettier + ESLint)
- Dockerfile best practices (Hadolint)
- CI/CD workflow validation (Actionlint)

❌ **NOT Replaced** (and not needed):

- Centralized issue dashboard (use GitHub Issues + Projects)
- Historical trend tracking (use GitHub Actions artifacts + Datadog)
- Hotspot prioritization by impact (use code review processes)

## Running Locally

### Prerequisites

Install required tools on your machine:

```bash
# JavaScript/TypeScript tools (via package.json)
pnpm install

# System tools (macOS example; use your package manager)
brew install semgrep hadolint actionlint jq
npm install -g jscpd reviewdog
```

### Quick Start

```bash
# Run all quality checks
.ci/quality/run.sh

# Merge and evaluate
.ci/quality/merge-sarif.sh
.ci/quality/gate.sh

# View results
cat .ci/quality/reports/quality.sarif | jq '.runs[].results | length'
```

### Running Individual Scanners

```bash
# ESLint
pnpm exec eslint "**/*.{js,jsx,ts,tsx}" --format json > eslint-raw.json
node .ci/quality/scripts/eslint-to-sarif.js eslint-raw.json > eslint.sarif

# TypeScript — no root tsconfig.json exists, so each workspace's tsconfig
# must be checked explicitly. Bare `tsc --noEmit` at the repo root has no
# config to find and just prints the CLI help text (exit 1, zero real checks).
pnpm exec tsc --noEmit -p apps/console/tsconfig.json > tsc-raw.log 2>&1
pnpm exec tsc --noEmit -p packages/ui-web/tsconfig.json >> tsc-raw.log 2>&1
node .ci/quality/scripts/typescript-to-sarif.js tsc-raw.log > typescript.sarif

# Prettier (format check)
pnpm exec prettier "**/*.{js,jsx,ts,tsx,json,css,md}" --check > prettier-raw.log 2>&1
node .ci/quality/scripts/prettier-to-sarif.js prettier-raw.log > prettier.sarif

# Semgrep — emits SARIF natively, no converter. --error distinguishes real
# findings (exit 1) from a genuine rule/config error (any other exit code).
semgrep --config .ci/rules/semgrep --sarif --output semgrep.sarif --error .

# Hadolint — emits SARIF natively to stdout (no -o/--output flag exists;
# that name is --file-path-in-report, which rewrites the path shown inside
# the report, not where it's written). --no-fail means findings never cause
# a nonzero exit, so any nonzero exit here is a real error.
hadolint --format sarif --no-fail Dockerfile > hadolint.sarif

# Actionlint — -format takes a Go template, not a format name.
# `actionlint -format json` is invalid and fails before linting anything.
actionlint -format '{{json .}}' .github/workflows/*.yml > actionlint-raw.json
node .ci/quality/scripts/actionlint-to-sarif.js actionlint-raw.json > actionlint.sarif

# jscpd — emits SARIF natively (jscpd-sarif.json under --output), no
# converter. Scanning "." unfiltered walks node_modules/.git/dist/etc. and
# can OOM-crash the process — scope to apps/packages with explicit --ignore.
jscpd --reporters sarif --output ./jscpd-report \
  --ignore "**/node_modules/**,**/.git/**,**/dist/**,**/.turbo/**,**/generated/**" \
  apps packages
```

## Pull Request Workflow

When a PR is opened:

1. **Workflow triggers** on `pull_request` with `fetch-depth: 0`
2. **Scanners run** independently — today this means ESLint, TypeScript, and Prettier
   only; Semgrep/Hadolint/Actionlint/jscpd are skipped, absent from the runner (Known Gap)
3. **SARIF files merge** into `quality.sarif`
4. **`gate.sh` checks scanner health** — fails only if a tool crashed or
   mis-configured; does NOT fail on the repo-wide finding count (that would
   fail every PR on the existing backlog)
5. **reviewdog attempts to post** a GitHub PR check with:
   - `reporter=github-pr-check` (GitHub Check API) — or `github-actions`
     (workflow annotations) on fork PRs, where the token can't write checks
   - `filter-mode=added` (only new/modified lines)
   - `fail-on-error=true` — designed to be what actually fails the PR check, for
     new `error`-level findings in the diff
   - **As of the current runner (Known Gap above), this step is a no-op**: reviewdog
     isn't installed, so it prints `reviewdog not found in PATH; skipping PR check` and
     exits `0` on every run, PR-triggered or not. Nothing currently fails a PR check on
     scanner findings.
6. **PR author** reviews check and either:
   - Fixes findings (preferred)
   - Suppresses with documented reason (if acceptable)
   - Requests reviewer to override (if false positive)

### Example PR Check Output

```
Quality Pipeline · 3 annotations
  ✗ Semgrep · typescript.security.no-hardcoded-secrets
    line 42: Hardcoded API key. Use environment variables.

  ⚠ Prettier · format/indent
    line 87: File does not match Prettier formatting.

  ℹ jscpd · duplication
    lines 105–120: Duplicate code found with other-file.ts:50–65
```

## Updating Tools & Rules

### Semgrep Rules

Add new rules to `.ci/rules/semgrep/`:

```bash
.ci/rules/semgrep/
  ├── security.yml          # Security patterns
  ├── performance.yml       # Performance anti-patterns
  └── maintainability.yml   # Code quality rules
```

Each rule includes:

- `id`: Unique identifier — Semgrep only allows `[a-zA-Z0-9._-]`, so use dots
  as separators (e.g., `typescript.security.no-hardcoded-secrets`), never `/`
- `pattern`: Semgrep pattern syntax to match — must be valid, parseable code
  for the target language (a JSX attribute like `foo={{ bar: baz }}` needs
  to be wrapped in an element pattern, e.g. `<$TAG ... foo={$BAR} ... />`,
  not written as a bare standalone fragment)
- `message`: Human-readable explanation
- `severity`: `ERROR`, `WARNING`, or `INFO` (not `NOTE` — that value doesn't
  exist and fails rule validation; `INFO` maps to SARIF's `note` level)
- `languages`: Target languages (e.g., `typescript`, `javascript`)

**Example rule:**

```yaml
rules:
  - id: typescript.security.dangerous-regexp
    patterns:
      - pattern: new RegExp($EXPR) # Without Regex.escape or validation
    message: Regular expression from untrusted input is a ReDoS risk.
    severity: WARNING
    languages: [typescript, javascript]
```

Validate a rule file before committing — an invalid rule silently makes
Semgrep report **zero findings** for the whole config, not just that rule:

```bash
semgrep --config .ci/rules/semgrep --sarif --output /tmp/test.sarif --error .
jq '.runs[0].invocations[0].toolExecutionNotifications' /tmp/test.sarif
# [] means every rule loaded cleanly
```

### Tool Versions

Update versions in `.ci/quality/.tool-versions`:

```yaml
# Node.js tools (from package.json)
eslint: 9.39.4
typescript: 5.9.3
prettier: 3.8.3

# System tools (NOT currently installed in CI — see the Known Gap above.
# These versions are what the pipeline was designed against; jq is the only
# one still present on the ubuntu-latest image out of the box.)
semgrep: 1.45.0
hadolint: 2.12.0
actionlint: 1.7.1
jscpd: 4.0.5
jq: 1.7
reviewdog: 0.20.0
```

Update your local toolchain to these versions. Re-provisioning a CI runner no longer
applies — `quality.yml` runs on GitHub-hosted `ubuntu-latest`, which is rebuilt from
GitHub's own image on every job; installing these five tools there would require adding
explicit install steps to `quality.yml`, which does not currently exist.

## Suppressing Findings

### By Tool

**ESLint / TypeScript / Prettier** (inline, preferred):

```typescript
// eslint-disable-next-line no-unsafe-optional-chaining
const x = obj?.method?.();

// @ts-ignore
const y: string = 123;

// prettier-ignore
const z = 'long string that should not be formatted';
```

**Semgrep** (baseline file):
Edit `.ci/baselines/.semgrep.json`:

```json
[
  {
    "ruleId": "typescript.security/sql-injection-template",
    "filePath": "apps/self-service/src/db/query.ts",
    "expiresAt": "2026-12-31",
    "reason": "Query parameterization verified; false positive.",
    "ticket": "#123"
  }
]
```

**Hadolint** (inline in Dockerfile):

```dockerfile
# hadolint disable=DL3007
FROM node:latest
```

**Actionlint** (workflow YAML comment):

```yaml
jobs:
  # actionlint disable SC2086
  deploy:
    runs-on: ubuntu-latest
```

### Expiration Policy

Every suppression **must** include an expiration date (6–12 months):

- **6 months**: False positives or temporary workarounds
- **12 months**: Longer-term technical debt
- **Never "permanent"**: If truly permanent, close as won't-fix

On expiration date, re-evaluate and either:

- Remove the suppression (issue fixed)
- Update expiration date (still needed)
- Close as won't-fix (decision made)

## Quality Gate Thresholds

Two independent mechanisms, deliberately not merged into one:

**`gate.sh` fails CI (exit 1) only for:**

- A scanner execution/configuration error — a tool crashing (OOM, signal
  kill), a missing required tool, an invalid rule file, or a missing/invalid
  merged SARIF. Tracked per-tool in `scanner-status.txt`, written by `run.sh`.
- It never fails based on the number of findings in the merged SARIF — that
  SARIF is repo-wide, and gating on it would fail every PR on the backlog.

**reviewdog fails the PR check only for:**

- A newly-introduced `error`-level finding on an added/changed line
  (`-filter-mode=added -fail-on-error`, pull_request event only)
- Warnings and notes are posted as annotations without failing

**PR Behavior:**

- Only **new/modified** findings can fail the check — via reviewdog, not `gate.sh`
- Baseline findings are NOT re-reported and never fail a PR on their own
- Historical findings remain in the merged SARIF artifact and in `gate.sh`'s
  informational summary for reference

## GitHub Code Scanning Integration (Optional)

To enable Code Scanning upload:

1. **Set repository variable:**

   ```
   Repo settings → Secrets and variables → Variables
   Add: ENABLE_CODE_SCANNING = true
   ```

2. **Workflow will upload SARIF** on main branch pushes

3. **View findings** in:
   ```
   Repo → Security → Code scanning alerts
   ```

**Notes:**

- Upload is **optional**; pipeline is fully functional without it
- Uses category `quality-pipeline` to avoid mixing with other scanners
- Only runs on default branch (not on PRs or scheduled runs)
- Does NOT replace the security workflow (Trivy + Gitleaks)

## Limitations

This pipeline replaces SonarQube CE's **scanning and quality gates**, but **not:**

- Centralized dashboard / issue management (use GitHub Issues + Projects)
- Historical trend analysis (use GitHub Actions artifacts + external analytics)
- Hotspot prioritization by risk score (use code review processes)
- Automated issue lifecycle (use GitHub automation)

For centralized metrics, export SARIF data to a data warehouse or analytics platform.

## Troubleshooting

### Workflow doesn't trigger

Check:

- Branch matches `main` for PRs
- `fetch-depth: 0` is set (required for reviewdog diffs)
- Concurrency rules don't cancel the run

### Tools report "not found"

Locally:

- Install: `pnpm install` (ESLint, TypeScript, Prettier)
- Install system tools: `brew install semgrep hadolint actionlint` (macOS), `npm install -g jscpd reviewdog`
- Ensure tools are in `$PATH`

In CI: this is currently expected, not a misconfiguration to chase — see the Known Gap at
the top of this document. `quality.yml` runs on `ubuntu-latest` and never installs Semgrep,
Hadolint, Actionlint, jscpd, or reviewdog. Fixing it means adding install steps to
`quality.yml` (or moving the job back to a runner that provisions them), not debugging the
existing script.

### reviewdog not posting checks

On the current runner, reviewdog isn't installed at all (see Known Gap) — the step prints
`reviewdog not found in PATH; skipping PR check` and exits `0` unconditionally. If/when
reviewdog is installed in CI again, the remaining checks are:

- Workflow has `pull-requests: write` permission
- `REVIEWDOG_GITHUB_API_TOKEN` is set — reviewdog's GitHub reporters read
  this specific variable name, **not** `GITHUB_TOKEN`
- SARIF file is valid: `jq empty .ci/quality/reports/quality.sarif`
- Run `reviewdog -v` to verify installation
- On a fork PR, expect the `github-actions` reporter (workflow annotations)
  instead of `github-pr-check` — a fork's token can't write PR checks

### SARIF validation fails

Check with jq:

```bash
jq . .ci/quality/reports/quality.sarif > /dev/null && echo "Valid"
```

For individual tool output:

```bash
jq . .ci/quality/reports/eslint.sarif
```

## See Also

- [Operations & Maintenance](.ci/quality/README.md)
- [Baseline Suppressions](.ci/baselines/README.md)
- [Semgrep Rules](.ci/rules/semgrep/)
- [Tool Versions](.ci/quality/.tool-versions)
- [SARIF 2.1.0 Specification](https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json)
- [reviewdog Documentation](https://github.com/reviewdog/reviewdog)
