# Quality Pipeline

Offline-capable SAST, linting, and maintainability scanning for the converse-frontends repository.

## Overview

The quality pipeline replaces SonarQube CE's practical responsibilities by running local, offline scanners on a self-hosted GitHub Actions runner and reporting findings to pull requests via reviewdog.

**Scanners:**
- **ESLint**: Linting and pattern-based SAST
- **TypeScript**: Type checking
- **Prettier**: Format verification
- **Semgrep**: Rule-based SAST (local rules)
- **Hadolint**: Dockerfile linting (if Dockerfile present)
- **Actionlint**: GitHub Actions workflow validation
- **jscpd**: Code duplication detection

**Reporting:**
- Individual SARIF reports per tool (`.ci/quality/reports/*.sarif`)
- Merged SARIF (`.ci/quality/reports/quality.sarif`)
- Pull request checks via reviewdog (GitHub PR checks)
- Artifacts retained for 30 days

## Running Locally

### Prerequisites

All scanning tools must be pre-provisioned on the machine or runner:

```bash
# JavaScript/TypeScript tools (via pnpm/npm)
eslint          # ^9.39.4
prettier        # ^3.8.3
typescript      # ~5.9.3

# Standalone binaries (must be in PATH)
semgrep         # https://semgrep.dev
hadolint        # https://github.com/hadolint/hadolint (if Dockerfile present)
actionlint      # https://github.com/rhysd/actionlint
jscpd           # npm install -g jscpd

# Utilities
jq              # For SARIF validation
reviewdog       # For PR reporting (optional locally)
```

### Quick Start

```bash
# Run all quality checks
.ci/quality/run.sh

# Merge reports
.ci/quality/merge-sarif.sh

# Evaluate quality gate
.ci/quality/gate.sh

# View merged report
cat .ci/quality/reports/quality.sarif
```

### Individual Checks

```bash
# ESLint
pnpm exec eslint "**/*.{js,jsx,ts,tsx}" --format json

# TypeScript — this monorepo has no root tsconfig.json, only per-workspace
# ones. Run each explicitly; bare `tsc --noEmit` at the root just prints
# the CLI help text and exits 1 (looks like "found issues" but checked nothing).
pnpm exec tsc --noEmit -p apps/self-service/tsconfig.json
pnpm exec tsc --noEmit -p packages/ui/tsconfig.json

# Prettier
pnpm exec prettier "**/*.{js,jsx,ts,tsx,json,css,md}" --check

# Semgrep — emits SARIF natively, no converter needed. --error makes it
# exit 1 on real findings (vs 0 on clean) so a genuine rule/config error
# (any other exit code) is distinguishable from findings.
semgrep --config .ci/rules/semgrep --sarif --output semgrep.sarif --error .

# Hadolint — emits SARIF natively to stdout (no -o/--output flag exists;
# that name is --file-path-in-report, which rewrites the path shown inside
# the report, not where it's written). --no-fail means findings never cause
# a nonzero exit; a nonzero exit here is a real error.
hadolint --format sarif --no-fail Dockerfile > hadolint.sarif

# Actionlint — -format takes a Go template, not a format name.
# `actionlint -format json` is invalid syntax and fails before linting anything.
actionlint -format '{{json .}}' .github/workflows/*.yml

# jscpd — emits SARIF natively (jscpd-sarif.json in --output dir), no
# converter needed. Explicit --ignore + scoping to apps/packages is required:
# scanning "." unfiltered walks node_modules/.git/dist/etc. and OOM-crashes.
jscpd --reporters sarif --output ./jscpd-report \
  --ignore "**/node_modules/**,**/.git/**,**/dist/**,**/.turbo/**,**/generated/**" \
  apps packages
```

## SARIF Converters

Semgrep, Hadolint, and jscpd all emit SARIF natively — `run.sh` uses their
output directly, no conversion step. The remaining tools' native output
formats get converted to SARIF 2.1.0 by small Node.js scripts in
`.ci/quality/scripts/`:

- `eslint-to-sarif.js`: ESLint JSON → SARIF
- `typescript-to-sarif.js`: TypeScript compiler log → SARIF
- `prettier-to-sarif.js`: Prettier check output → SARIF
- `actionlint-to-sarif.js`: actionlint JSON (via `-format '{{json .}}'`) → SARIF
- `merge-sarif.js`: Merge multiple SARIF files

Each converter is invoked from `run.sh` and handles parsing, normalization, and SARIF schema compliance.

## Suppressing Findings

### ESLint / TypeScript / Prettier

Use the standard inline suppression syntax:

```typescript
// eslint-disable-next-line no-console
console.log('debug');

// @ts-ignore
const x: string = 123;
```

### Semgrep

Add findings to `.ci/baselines/.semgrep.json` (managed manually or via `semgrep --audit` integration):

```json
[
  {
    "ruleId": "typescript.react/jsx-no-inline-styles",
    "filePath": "apps/self-service/src/components/special-case.tsx",
    "expiresAt": "2026-12-31",
    "reason": "Inline styles required for dynamic theming in this specific component"
  }
]
```

### Dockerfile / Workflows / Duplication

- **Hadolint**: Use `# hadolint disable=DL3007` in Dockerfile
- **Actionlint**: Use workflow YAML comments where appropriate
- **jscpd**: Add to `.ci/baselines/.jscpd-ignore.json` (if significant duplication is unavoidable)

## Quality Gate Thresholds

`gate.sh` and reviewdog own two different, deliberately separate jobs:

**`gate.sh` fails (CI red) only on genuine scanner execution/configuration
errors** — a tool crashing, a rule file failing to parse, a missing/invalid
merged SARIF. It reads `.ci/quality/reports/scanner-status.txt` (written by
`run.sh`, one `tool=ok|skipped|error` line per scanner) and fails if any
tool is marked `error`. It does **not** fail based on the number or severity
of findings in the merged SARIF — that SARIF is repo-wide, and gating on it
would fail every PR on the pre-existing backlog.

**reviewdog fails the PR check only for newly-introduced `error`-level
findings**, scoped to the diff (`-filter-mode added -fail-on-error`, PR
event only). It is diff-aware; `gate.sh` is not — that's why the two are
split. Warnings/notes are reported as annotations without failing.

**PR Behavior:**
- Only NEW findings (added/modified lines) can fail the check, via reviewdog
- Historical/backlog findings remain visible in the merged SARIF artifact
  and in `gate.sh`'s informational summary, but never fail CI on their own

## GitHub Code Scanning (Optional)

To upload findings to GitHub Code Scanning:

1. Set repository variable: `ENABLE_CODE_SCANNING=true`
2. Ensure workflow has `contents: write` permission (not default)
3. Findings will be uploaded on main branch pushes only

The merged SARIF is uploaded with category `quality-pipeline` to keep it separate from other scanning tools.

**Note:** Code Scanning upload is optional and the pipeline is fully functional without it. Use only if you need GitHub's Code Scanning dashboard and history.

## Maintenance

### Updating Tool Versions

Edit `.ci/quality/.tool-versions` and update `.ci/baselines/.runner-provisioning.md`:

```yaml
eslint: 9.39.4
typescript: 5.9.3
prettier: 3.8.3
semgrep: 1.45.0
hadolint: 2.12.0
actionlint: 1.7.1
jscpd: 4.0.5
```

Then re-provision the self-hosted runner or update your local toolchain.

### Adding Semgrep Rules

Place new rule files in `.ci/rules/semgrep/`:

```bash
.ci/rules/semgrep/
  ├── security.yml          # Security patterns
  ├── performance.yml       # Performance anti-patterns
  └── maintainability.yml   # Code quality
```

Semgrep scans the entire directory recursively via `semgrep --config .ci/rules/semgrep`.

### Custom SARIF Converters

To add a new scanner:

1. Create a converter script: `.ci/quality/scripts/toolname-to-sarif.js`
2. Add scanner invocation to `.ci/quality/run.sh`
3. Ensure SARIF output respects:
   - File paths as repository-relative POSIX URIs
   - Proper `level` mapping (error / warning / note)
   - Stable `ruleId` for deduplication across runs

## Troubleshooting

### "Tool not found" warnings

The pipeline gracefully skips unavailable tools. To enforce tool presence:

1. Update runner provisioning documentation in `.ci/baselines/.runner-provisioning.md`
2. Add pre-flight checks to `.ci/quality/run.sh` if a tool is required

### Invalid SARIF

Validate the merged report:

```bash
jq empty .ci/quality/reports/quality.sarif && echo "Valid SARIF"
```

Check individual tool reports for malformed JSON:

```bash
ls -la .ci/quality/reports/*.sarif
jq . .ci/quality/reports/eslint.sarif
```

### reviewdog not reporting findings

Ensure:
- Workflow has `pull-requests: write` permission
- `REVIEWDOG_GITHUB_API_TOKEN` is set — reviewdog's GitHub reporters read
  this specific variable name, **not** `GITHUB_TOKEN`
- reviewdog is installed on the runner
- SARIF file exists and is valid
- For fork PRs, the workflow falls back to the `github-actions` reporter
  (workflow annotations) since a fork's `GITHUB_TOKEN` can't write PR checks

Test locally:

```bash
REVIEWDOG_GITHUB_API_TOKEN=$GITHUB_TOKEN reviewdog -f sarif -reporter github-pr-check < .ci/quality/reports/quality.sarif
```

## See Also

- [Quality Pipeline Architecture](../../docs/quality-pipeline.md)
- [Tool Version Manifest](.tool-versions)
- [Baseline Suppressions](../baselines/README.md)
- [Semgrep Rule Repository](https://semgrep.dev/explore)
