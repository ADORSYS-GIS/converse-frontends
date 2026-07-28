# Quality Pipeline Architecture & Operations

## Overview

The quality pipeline is an offline-capable, self-hosted code quality scanning system that replaces SonarQube CE's practical responsibilities without introducing a SaaS platform.

**Key features:**
- ✅ Runs entirely on self-hosted infrastructure (adorsys-gis-runner)
- ✅ No external scanning platforms or cloud services
- ✅ Pull request checks via GitHub Check API + reviewdog
- ✅ Preserved reports as CI artifacts
- ✅ Gradual adoption: only reports new findings on PRs
- ✅ Comprehensive SAST, linting, and maintainability checks

## Architecture

```
┌─────────────────────────────────────────────┐
│  GitHub Actions: quality.yml                │
│  (runs on adorsys-gis-runner)               │
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
       ┌────────────┴───────────────────────────────────────────────┐
       │                                                             │
       ▼           ▼           ▼          ▼         ▼        ▼
    ESLint    TypeScript   Prettier   Semgrep  Hadolint Actionlint jscpd
    ──────────────────────────────────────────────────────────────────
    .json   .log/.json     stdout      .sarif    .json     .json     .json
       │           │          │         │         │         │         │
       └───────────┴──────────┴─────────┴─────────┴─────────┴─────────┘
                              │
       ┌──────────────────────▼──────────────────────┐
       │  Converters (Node.js scripts)               │
       │  - eslint-to-sarif.js                       │
       │  - typescript-to-sarif.js                   │
       │  - prettier-to-sarif.js                     │
       │  - hadolint-to-sarif.js                     │
       │  - actionlint-to-sarif.js                   │
       │  - jscpd-to-sarif.js                        │
       └──────────────────────┬──────────────────────┘
                              │
       ┌──────────────────────▼──────────────────────┐
       │  .ci/quality/merge-sarif.sh                 │
       │  → Combines all SARIF into quality.sarif    │
       └──────────────────────┬──────────────────────┘
                              │
       ┌──────────────────────▼──────────────────────┐
       │  .ci/quality/gate.sh                        │
       │  - Evaluates pass/fail criteria             │
       │  - Counts critical/high/medium/low          │
       │  - Returns exit code for CI                 │
       └──────────────────────┬──────────────────────┘
                              │
       ┌──────────────────────┴───────────────────────┐
       │                                              │
       ▼                                              ▼
   GitHub Code Scanning          GitHub PR Checks (reviewdog)
   (optional, main branch)        (filter-mode: added)
       └──────────────────────────────────────────────┘
```

## Enabled Scanners & Replacements

### SAST (Static Application Security Testing)

| Scanner | What It Finds | SonarQube CE Equivalent |
|---------|--|--|
| **ESLint** | Linting violations, unsafe patterns, style issues | Built-in code smells |
| **Semgrep** | Security patterns, anti-patterns (custom rules) | Custom rule engine |
| **TypeScript Compiler** | Type errors, strict mode violations | Type checking |

**Output:** SARIF with `error` and `warning` levels.

### Linting & Formatting

| Tool | What It Finds | SonarQube CE Equivalent |
|------|--|--|
| **Prettier** | Format violations (indentation, line length) | Code formatting rules |
| **ESLint** | Style, naming, best practices | Built-in quality rules |

**Output:** Violations mapped to SARIF `note` level.

### Infrastructure & Configuration

| Tool | What It Finds | SonarQube CE Equivalent |
|------|--|--|
| **Hadolint** | Dockerfile best practices, security issues | No direct equivalent |
| **Actionlint** | GitHub Actions YAML validation | No direct equivalent |

**Output:** SARIF with `warning` level.

### Code Quality & Duplication

| Tool | What It Finds | SonarQube CE Equivalent |
|------|--|--|
| **jscpd** | Copy-paste code, duplication | Duplication ratio |

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
pnpm exec eslint "**/*.{js,jsx,ts,tsx}" --format json | \
  node .ci/quality/scripts/eslint-to-sarif.js

# TypeScript
pnpm exec tsc --noEmit 2>&1 | \
  node .ci/quality/scripts/typescript-to-sarif.js /dev/stdin

# Prettier (format check)
pnpm exec prettier "**/*" --check 2>&1 | \
  node .ci/quality/scripts/prettier-to-sarif.js /dev/stdin

# Semgrep
semgrep --config .ci/rules/semgrep --sarif .

# Hadolint
hadolint --format json Dockerfile | \
  node .ci/quality/scripts/hadolint-to-sarif.js /dev/stdin

# Actionlint
actionlint -format json .github/workflows/*.yml | \
  node .ci/quality/scripts/actionlint-to-sarif.js /dev/stdin

# jscpd
jscpd --reporters json . | \
  node .ci/quality/scripts/jscpd-to-sarif.js /dev/stdin
```

## Pull Request Workflow

When a PR is opened:

1. **Workflow triggers** on `pull_request` with `fetch-depth: 0`
2. **All scanners run** independently
3. **SARIF files merge** into `quality.sarif`
4. **Gate evaluates** critical/high findings
5. **reviewdog posts** GitHub PR check with:
   - `reporter=github-pr-check` (GitHub Check API)
   - `filter-mode=added` (only new/modified lines)
   - `fail-on-error=true` (fails on error level only)
6. **PR author** reviews check and either:
   - Fixes findings (preferred)
   - Suppresses with documented reason (if acceptable)
   - Requests reviewer to override (if false positive)

### Example PR Check Output

```
Quality Pipeline · 3 annotations
  ✗ ESLint · security/no-hardcoded-secrets
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
- `id`: Unique identifier (e.g., `typescript.security/no-hardcoded-secrets`)
- `pattern`: YAML/regex pattern to match
- `message`: Human-readable explanation
- `severity`: `ERROR`, `WARNING`, or `NOTE`
- `languages`: Target languages (e.g., `typescript`, `javascript`)

**Example rule:**
```yaml
rules:
  - id: typescript.security/dangerous-regexp
    patterns:
      - pattern: new RegExp($EXPR)  # Without Regex.escape or validation
    message: Regular expression from untrusted input is a ReDoS risk.
    severity: WARNING
    languages: [typescript, javascript]
```

### Tool Versions

Update versions in `.ci/quality/.tool-versions`:

```yaml
# Node.js tools (from package.json)
eslint: 9.39.4
typescript: 5.9.3
prettier: 3.8.3

# System tools (pre-provisioned on runner)
semgrep: 1.45.0
hadolint: 2.12.0
actionlint: 1.7.1
jscpd: 4.0.5
jq: 1.7
reviewdog: 0.20.0
```

Then re-provision the self-hosted runner or update your local toolchain.

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

**Fails CI (exit 1):**
- Scanner execution errors (missing tool, config error)
- Critical/error-level findings (security-critical)
- Confirmed secret leaks (from Gitleaks, if present)

**Warns (yellow, doesn't fail):**
- High-level findings (architectural issues)
- Medium/low findings (notes and suggestions)

**PR Behavior:**
- Only **new/modified** findings are reported to PR comments
- Baseline findings are NOT re-reported
- Historical findings remain in artifacts for reference

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

Solution:
- Install locally: `pnpm install` (ESLint, TypeScript, Prettier)
- Install system tools: `brew install semgrep hadolint actionlint` (macOS)
- Ensure tools are in `$PATH`

### reviewdog not posting checks

Ensure:
- Workflow has `pull-requests: write` permission
- `GITHUB_TOKEN` is available
- SARIF file is valid: `jq empty .ci/quality/reports/quality.sarif`
- Run `reviewdog -v` to verify installation

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
