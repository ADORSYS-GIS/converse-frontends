#!/usr/bin/env bash
set -uo pipefail

# Quality pipeline runner
# Orchestrates all SAST, linting, and maintainability checks.
# Produces individual SARIF reports under .ci/quality/reports/, plus a
# scanner-status.txt manifest recording ok/skipped/error per tool — gate.sh
# uses that manifest to fail on genuine scanner execution/config errors only.
# Real findings (however many) are NOT a run.sh/gate.sh failure: severity-based
# PR gating on added lines is reviewdog's job (.github/workflows/quality.yml).

REPORTS_DIR=".ci/quality/reports"
RULES_DIR=".ci/rules"
STATUS_FILE="$REPORTS_DIR/scanner-status.txt"

mkdir -p "$REPORTS_DIR"
: > "$STATUS_FILE"

echo "=== Quality Pipeline ==="
echo "Running SAST, linting, and code quality checks..."
echo ""

# record_status <tool> <exit_code> <ok_max_exit>
# Exit codes above <ok_max_exit> (findings-only codes) are treated as a
# scanner execution/config error. 128+ always means the process was killed
# by a signal (OOM/segfault/abort) and is always an error.
record_status() {
  local tool="$1" exit_code="$2" ok_max="$3"
  if [ "$exit_code" -ge 128 ]; then
    echo "$tool=error" >> "$STATUS_FILE"
    echo "  ✗ $tool CRASHED (killed by signal, exit $exit_code)"
  elif [ "$exit_code" -le "$ok_max" ]; then
    echo "$tool=ok" >> "$STATUS_FILE"
  else
    echo "$tool=error" >> "$STATUS_FILE"
    echo "  ✗ $tool exited $exit_code — execution/configuration error, not real findings"
  fi
}

# =============================================================================
# 1. ESLint (Linting & SAST patterns)
# =============================================================================
echo "[1/7] ESLint"
pnpm exec eslint "**/*.{js,jsx,ts,tsx}" --format json \
  > "$REPORTS_DIR/eslint-raw.json" 2>"$REPORTS_DIR/eslint-raw.stderr"
eslint_exit=$?
node .ci/quality/scripts/eslint-to-sarif.js "$REPORTS_DIR/eslint-raw.json" \
  > "$REPORTS_DIR/eslint.sarif"
# ESLint: 0 = clean, 1 = lint findings, 2 = fatal/config error.
record_status eslint "$eslint_exit" 1
echo ""

# =============================================================================
# 2. TypeScript (Type checking)
# =============================================================================
echo "[2/7] TypeScript"
: > "$REPORTS_DIR/typescript-raw.log"
tsc_exit=0
# This monorepo has no root tsconfig.json — only individual workspaces do.
# Type-check each one explicitly rather than invoking bare `tsc` at the root
# (which has no config to find and just prints the CLI help text).
TSCONFIGS=()
while IFS= read -r cfg; do
  TSCONFIGS+=("$cfg")
done < <(find apps packages -maxdepth 2 -name tsconfig.json \
  -not -path '*/node_modules/*' -not -path '*/generated/*' 2>/dev/null | sort)
if [ "${#TSCONFIGS[@]}" -eq 0 ]; then
  echo "  ⊘ No tsconfig.json found under apps/ or packages/; skipping"
  echo "typescript=skipped" >> "$STATUS_FILE"
else
  for cfg in "${TSCONFIGS[@]}"; do
    echo "--- $cfg ---" >> "$REPORTS_DIR/typescript-raw.log"
    pnpm exec tsc --noEmit -p "$cfg" >> "$REPORTS_DIR/typescript-raw.log" 2>&1
    cfg_exit=$?
    [ "$cfg_exit" -gt "$tsc_exit" ] && tsc_exit=$cfg_exit
  done
  node .ci/quality/scripts/typescript-to-sarif.js "$REPORTS_DIR/typescript-raw.log" \
    > "$REPORTS_DIR/typescript.sarif"
  # tsc: 0 = clean, nonzero = type errors reported (or a real config error,
  # which the "no tsconfig" case above already prevents at the invocation level).
  record_status typescript "$tsc_exit" 2
fi
echo ""

# =============================================================================
# 3. Prettier (Format check)
# =============================================================================
echo "[3/7] Prettier"
pnpm exec prettier "**/*.{js,jsx,ts,tsx,json,css,md}" --check --ignore-path .gitignore \
  > "$REPORTS_DIR/prettier-raw.log" 2>&1
prettier_exit=$?
node .ci/quality/scripts/prettier-to-sarif.js "$REPORTS_DIR/prettier-raw.log" \
  > "$REPORTS_DIR/prettier.sarif"
# Prettier: 0 = formatted, 1 = format findings, 2 = actual error (e.g. parse failure).
record_status prettier "$prettier_exit" 1
echo ""

# =============================================================================
# 4. Semgrep (SAST — local rules only, native SARIF output)
# =============================================================================
echo "[4/7] Semgrep"
if command -v semgrep &> /dev/null; then
  semgrep --config "$RULES_DIR/semgrep" \
    --sarif --output "$REPORTS_DIR/semgrep.sarif" \
    --error --metrics=off \
    . > "$REPORTS_DIR/semgrep-console.log" 2>&1
  semgrep_exit=$?
  # --error: 0 = clean, 1 = real findings. Anything else (rule/config errors,
  # e.g. invalid YAML or an unparseable pattern) is a genuine scanner error.
  record_status semgrep "$semgrep_exit" 1
else
  echo "  ⊘ semgrep not found; skipping"
  echo "semgrep=skipped" >> "$STATUS_FILE"
fi
echo ""

# =============================================================================
# 5. Hadolint (Dockerfile linting, native SARIF output)
# =============================================================================
echo "[5/7] Hadolint"
if [ ! -f Dockerfile ]; then
  echo "  ⊘ Dockerfile not found; skipping"
  echo "hadolint=skipped" >> "$STATUS_FILE"
elif command -v hadolint &> /dev/null; then
  # hadolint writes its report to stdout — there is no -o/--output flag
  # (that name is taken by --file-path-in-report, which just rewrites the
  # path shown inside the report, not where it's written).
  hadolint --format sarif --no-fail Dockerfile > "$REPORTS_DIR/hadolint.sarif"
  hadolint_exit=$?
  # --no-fail means findings never cause a nonzero exit; any nonzero here is
  # a genuine execution error (e.g. Dockerfile failed to parse).
  record_status hadolint "$hadolint_exit" 0
else
  echo "  ⊘ hadolint not found; skipping"
  echo "hadolint=skipped" >> "$STATUS_FILE"
fi
echo ""

# =============================================================================
# 6. Actionlint (GitHub Actions workflow validation)
# =============================================================================
echo "[6/7] Actionlint"
if command -v actionlint &> /dev/null; then
  # -format takes a Go template, not a format name — '{{json .}}' is the
  # documented way to get JSON output (`actionlint -format json` is invalid
  # and fails before linting anything).
  actionlint -format '{{json .}}' .github/workflows/*.yml \
    > "$REPORTS_DIR/actionlint-raw.json" 2>"$REPORTS_DIR/actionlint-raw.stderr"
  actionlint_exit=$?
  node .ci/quality/scripts/actionlint-to-sarif.js "$REPORTS_DIR/actionlint-raw.json" \
    > "$REPORTS_DIR/actionlint.sarif"
  # actionlint: 0 = clean, 1 = findings.
  record_status actionlint "$actionlint_exit" 1
else
  echo "  ⊘ actionlint not found; skipping"
  echo "actionlint=skipped" >> "$STATUS_FILE"
fi
echo ""

# =============================================================================
# 7. jscpd (Code duplication, native SARIF output)
# =============================================================================
echo "[7/7] jscpd"
if command -v jscpd &> /dev/null; then
  # Scoped to apps/+packages/ (not repo root) and with explicit --ignore
  # globs: scanning "." unfiltered previously walked node_modules, .git,
  # dist, .turbo, etc. and OOM-crashed the Node process.
  jscpd --reporters sarif \
    --output "$REPORTS_DIR/jscpd" \
    --ignore "**/node_modules/**,**/.git/**,**/dist/**,**/.turbo/**,**/build-storybook/**,**/storybook-static/**,**/generated/**,**/.expo/**,**/web-build/**,**/coverage/**" \
    apps packages > "$REPORTS_DIR/jscpd-console.log" 2>&1
  jscpd_exit=$?
  if [ -f "$REPORTS_DIR/jscpd/jscpd-sarif.json" ]; then
    mv "$REPORTS_DIR/jscpd/jscpd-sarif.json" "$REPORTS_DIR/jscpd.sarif"
  fi
  # jscpd has no --threshold/--exitCode set here, so it only exits nonzero on
  # a genuine crash — never for duplication found.
  record_status jscpd "$jscpd_exit" 0
else
  echo "  ⊘ jscpd not found; skipping"
  echo "jscpd=skipped" >> "$STATUS_FILE"
fi
echo ""

echo "=== Summary ==="
echo "All enabled scanners completed. Reports available in: $REPORTS_DIR"
cat "$STATUS_FILE"
echo ""

# run.sh itself only fails on a genuine scanner error — gate.sh re-checks
# this same manifest and is the authoritative pass/fail decision for CI.
if grep -q '=error$' "$STATUS_FILE"; then
  exit 1
fi
exit 0
