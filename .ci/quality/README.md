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

# TypeScript
pnpm exec tsc --noEmit

# Prettier
pnpm exec prettier "**/*.{js,jsx,ts,tsx,json,css,md}" --check

# Semgrep
semgrep --config .ci/rules/semgrep --sarif .

# Hadolint
hadolint --format json Dockerfile

# Actionlint
actionlint -format json .github/workflows/*.yml

# jscpd
jscpd --reporters json .
```

## SARIF Converters

The pipeline includes Node.js scripts that convert tool-specific output formats to SARIF 2.1.0:

- `eslint-to-sarif.js`: ESLint JSON → SARIF
- `typescript-to-sarif.js`: TypeScript compiler log → SARIF
- `prettier-to-sarif.js`: Prettier check output → SARIF
- `hadolint-to-sarif.js`: Hadolint JSON → SARIF
- `actionlint-to-sarif.js`: actionlint JSON → SARIF
- `jscpd-to-sarif.js`: jscpd JSON → SARIF
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

**Fail (CI red):**
- Scanner execution errors or missing tool
- Critical/error-level findings (security-critical issues, confirmed secrets)

**Warn (CI yellow, doesn't fail):**
- High-severity findings
- Medium/low findings are informational

**PR Behavior:**
- Only NEW findings are reported to the PR (not baseline findings)
- Reviewdog filters to added/modified lines (use `-filter-mode added`)
- Historical findings remain in merged SARIF artifact for reference

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
- `GITHUB_TOKEN` is set
- reviewdog is installed on the runner
- SARIF file exists and is valid

Test locally:

```bash
reviewdog -f sarif -reporter github-pr-check < .ci/quality/reports/quality.sarif
```

## See Also

- [Quality Pipeline Architecture](../../docs/quality-pipeline.md)
- [Tool Version Manifest](.tool-versions)
- [Baseline Suppressions](../baselines/README.md)
- [Semgrep Rule Repository](https://semgrep.dev/explore)
