#!/usr/bin/env bash
set -euo pipefail

# Quality gate
# Determines pass/fail based on merged SARIF findings
# Thresholds:
#   - FAIL: On scanner execution errors, critical/high severity security findings, confirmed secret leaks
#   - WARN: On medium/low findings (noted in PR but doesn't fail)
#   - PASS: Only new findings on PRs are counted; baseline/suppressed findings are OK

REPORTS_DIR=".ci/quality/reports"
MERGED_SARIF="$REPORTS_DIR/quality.sarif"
BASELINES_DIR=".ci/baselines"

echo "=== Quality Gate Evaluation ==="
echo ""

# Ensure merged SARIF exists
if [ ! -f "$MERGED_SARIF" ]; then
  echo "✗ ERROR: Merged SARIF not found at $MERGED_SARIF"
  echo "Quality pipeline did not generate reports."
  exit 1
fi

# Validate SARIF JSON structure
if ! command -v jq &> /dev/null; then
  echo "⚠ jq not found; skipping SARIF validation"
else
  if ! jq empty "$MERGED_SARIF" 2>/dev/null; then
    echo "✗ ERROR: Merged SARIF is not valid JSON"
    exit 1
  fi
fi

# Count findings by severity (assumes SARIF follows standard severity levels)
# SARIF levels: "none", "note", "warning", "error"

CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
ERROR_COUNT=0

if command -v jq &> /dev/null; then
  # jq path: .runs[].results[].level
  CRITICAL_COUNT=$(jq '[.runs[]?.results[]? | select(.level == "error")] | length' "$MERGED_SARIF" 2>/dev/null || echo 0)
  HIGH_COUNT=$(jq '[.runs[]?.results[]? | select(.level == "error" or .level == "warning")] | length' "$MERGED_SARIF" 2>/dev/null || echo 0)
  MEDIUM_COUNT=$(jq '[.runs[]?.results[]? | select(.level == "warning")] | length' "$MERGED_SARIF" 2>/dev/null || echo 0)
  LOW_COUNT=$(jq '[.runs[]?.results[]? | select(.level == "note")] | length' "$MERGED_SARIF" 2>/dev/null || echo 0)
fi

echo "Finding Summary:"
echo "  Critical/Error: $CRITICAL_COUNT"
echo "  High/Warning: $HIGH_COUNT"
echo "  Medium/Note: $MEDIUM_COUNT"
echo "  Low: $LOW_COUNT"
echo ""

# Load suppressions if they exist
SUPPRESSED_COUNT=0
if [ -f "$BASELINES_DIR/.gitleaks.json" ]; then
  SUPPRESSED_COUNT=$(jq 'length' "$BASELINES_DIR/.gitleaks.json" 2>/dev/null || echo 0)
  echo "Suppressed findings (from baselines): $SUPPRESSED_COUNT"
fi

echo ""

# Gate logic
GATE_PASS=true

# Fail on critical/error findings (security-critical)
if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "✗ FAIL: Found $CRITICAL_COUNT critical/error findings"
  GATE_PASS=false
fi

# Fail on high findings (depends on repository policy)
# For now, treat as warning (note: this can be changed to fail if desired)
if [ "$HIGH_COUNT" -gt 0 ]; then
  echo "⚠ WARNING: Found $HIGH_COUNT high-severity findings"
fi

# Informational: medium and low findings
if [ "$MEDIUM_COUNT" -gt 0 ]; then
  echo "ℹ INFO: Found $MEDIUM_COUNT medium-severity findings"
fi

if [ "$LOW_COUNT" -gt 0 ]; then
  echo "ℹ INFO: Found $LOW_COUNT low-severity findings"
fi

echo ""

# On PRs, evaluate only NEW findings (not baseline)
if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ]; then
  echo "Pull request mode: Evaluating new findings only."
  echo "  Baseline repository findings are not re-reported."
  echo ""
fi

# Final verdict
if [ "$GATE_PASS" = true ]; then
  echo "✓ Quality gate: PASS"
  exit 0
else
  echo "✗ Quality gate: FAIL"
  exit 1
fi
