#!/usr/bin/env bash
set -euo pipefail

# Quality pipeline runner
# Orchestrates all SAST, linting, and maintainability checks
# Produces individual SARIF reports under .ci/quality/reports/

REPORTS_DIR=".ci/quality/reports"
RULES_DIR=".ci/rules"

# Ensure reports directory exists
mkdir -p "$REPORTS_DIR"

echo "=== Quality Pipeline ==="
echo "Running SAST, linting, and code quality checks..."
echo ""

EXIT_CODE=0

# =============================================================================
# 1. ESLint with SARIF output
# =============================================================================
echo "[1/7] ESLint (Linting & SAST patterns)"
if command -v eslint &> /dev/null; then
  eslint_exit=0
  pnpm exec eslint \
    "**/*.{js,jsx,ts,tsx}" \
    --format json \
    --ignore-path .gitignore \
    > "$REPORTS_DIR/eslint-raw.json" || eslint_exit=$?

  # Convert ESLint JSON to SARIF
  node .ci/quality/scripts/eslint-to-sarif.js \
    "$REPORTS_DIR/eslint-raw.json" \
    > "$REPORTS_DIR/eslint.sarif" || EXIT_CODE=$?

  if [ $eslint_exit -gt 0 ]; then
    echo "  ⚠ ESLint found issues (see report)"
  else
    echo "  ✓ ESLint passed"
  fi
else
  echo "  ⊘ ESLint not found; skipping"
fi
echo ""

# =============================================================================
# 2. TypeScript Compiler (Type Checking)
# =============================================================================
echo "[2/7] TypeScript (Type checking)"
tsc_exit=0
pnpm exec tsc --noEmit > "$REPORTS_DIR/typescript-raw.log" 2>&1 || tsc_exit=$?

# Convert TypeScript output to SARIF
node .ci/quality/scripts/typescript-to-sarif.js \
  "$REPORTS_DIR/typescript-raw.log" \
  > "$REPORTS_DIR/typescript.sarif" || EXIT_CODE=$?

if [ $tsc_exit -eq 0 ]; then
  echo "  ✓ TypeScript passed"
else
  echo "  ⚠ TypeScript found issues (see report)"
fi
echo ""

# =============================================================================
# 3. Prettier (Format Check)
# =============================================================================
echo "[3/7] Prettier (Format check)"
prettier_exit=0
pnpm exec prettier \
  "**/*.{js,jsx,ts,tsx,json,css,md}" \
  --check \
  --ignore-path .gitignore \
  > "$REPORTS_DIR/prettier-raw.log" 2>&1 || prettier_exit=$?

# Convert Prettier output to SARIF
node .ci/quality/scripts/prettier-to-sarif.js \
  "$REPORTS_DIR/prettier-raw.log" \
  > "$REPORTS_DIR/prettier.sarif" || EXIT_CODE=$?

if [ $prettier_exit -eq 0 ]; then
  echo "  ✓ Prettier passed"
else
  echo "  ⚠ Prettier found format issues (see report)"
fi
echo ""

# =============================================================================
# 4. Semgrep (SAST - Local Rules)
# =============================================================================
echo "[4/7] Semgrep (SAST - Local rules)"
if command -v semgrep &> /dev/null; then
  semgrep_exit=0
  semgrep \
    --config "$RULES_DIR/semgrep" \
    --sarif \
    --output "$REPORTS_DIR/semgrep.sarif" \
    . || semgrep_exit=$?

  if [ $semgrep_exit -eq 0 ]; then
    echo "  ✓ Semgrep passed (no rule violations)"
  else
    echo "  ⚠ Semgrep found findings (see report)"
  fi
else
  echo "  ⊘ Semgrep not found; skipping"
fi
echo ""

# =============================================================================
# 5. Hadolint (Dockerfile Linting)
# =============================================================================
echo "[5/7] Hadolint (Dockerfile linting)"
if [ -f Dockerfile ] && command -v hadolint &> /dev/null; then
  hadolint_exit=0
  hadolint \
    --format json \
    Dockerfile \
    > "$REPORTS_DIR/hadolint-raw.json" 2>&1 || hadolint_exit=$?

  # Convert Hadolint JSON to SARIF
  node .ci/quality/scripts/hadolint-to-sarif.js \
    "$REPORTS_DIR/hadolint-raw.json" \
    > "$REPORTS_DIR/hadolint.sarif" || EXIT_CODE=$?

  if [ $hadolint_exit -eq 0 ]; then
    echo "  ✓ Hadolint passed"
  else
    echo "  ⚠ Hadolint found issues (see report)"
  fi
else
  if [ ! -f Dockerfile ]; then
    echo "  ⊘ Dockerfile not found; skipping"
  else
    echo "  ⊘ Hadolint not found; skipping"
  fi
fi
echo ""

# =============================================================================
# 6. Actionlint (GitHub Actions Workflow Validation)
# =============================================================================
echo "[6/7] Actionlint (GitHub Actions workflows)"
if command -v actionlint &> /dev/null; then
  actionlint_exit=0
  actionlint \
    -format json \
    .github/workflows/*.yml \
    > "$REPORTS_DIR/actionlint-raw.json" 2>&1 || actionlint_exit=$?

  # Convert actionlint JSON to SARIF
  node .ci/quality/scripts/actionlint-to-sarif.js \
    "$REPORTS_DIR/actionlint-raw.json" \
    > "$REPORTS_DIR/actionlint.sarif" || EXIT_CODE=$?

  if [ $actionlint_exit -eq 0 ]; then
    echo "  ✓ Actionlint passed"
  else
    echo "  ⚠ Actionlint found issues (see report)"
  fi
else
  echo "  ⊘ Actionlint not found; skipping"
fi
echo ""

# =============================================================================
# 7. jscpd (Code Duplication Detection)
# =============================================================================
echo "[7/7] jscpd (Code duplication)"
if command -v jscpd &> /dev/null; then
  jscpd_exit=0
  jscpd \
    --reporters json \
    --output "$REPORTS_DIR/jscpd-raw.json" \
    . || jscpd_exit=$?

  # Convert jscpd output to SARIF
  node .ci/quality/scripts/jscpd-to-sarif.js \
    "$REPORTS_DIR/jscpd-raw.json" \
    > "$REPORTS_DIR/jscpd.sarif" || EXIT_CODE=$?

  if [ $jscpd_exit -eq 0 ]; then
    echo "  ✓ jscpd passed (no significant duplication)"
  else
    echo "  ⚠ jscpd found duplication (see report)"
  fi
else
  echo "  ⊘ jscpd not found; skipping"
fi
echo ""

echo "=== Summary ==="
echo "All enabled scanners completed. Reports available in: $REPORTS_DIR"
echo ""

exit $EXIT_CODE
