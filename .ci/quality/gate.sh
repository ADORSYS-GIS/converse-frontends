#!/usr/bin/env bash
set -uo pipefail

# Quality gate
#
# This gate FAILS ONLY on genuine scanner execution/configuration errors
# (a tool crashing, a rule file failing to load, a missing/invalid merged
# SARIF). It does NOT fail on the raw count of findings in the merged SARIF,
# because that SARIF is repo-wide and would otherwise fail every PR on the
# existing backlog — which is explicitly out of scope (see docs/quality-pipeline.md).
#
# Failing PRs for newly-introduced `error`-level findings, scoped to the
# diff, is reviewdog's job in .github/workflows/quality.yml
# (-filter-mode=added -fail-on-error) — it is diff-aware; this script is not.
#
# Severity counts below are printed for visibility/artifact value only and
# never affect the exit code.

REPORTS_DIR=".ci/quality/reports"
MERGED_SARIF="$REPORTS_DIR/quality.sarif"
STATUS_FILE="$REPORTS_DIR/scanner-status.txt"

echo "=== Quality Gate Evaluation ==="
echo ""

GATE_PASS=true

if [ ! -f "$MERGED_SARIF" ]; then
  echo "✗ ERROR: Merged SARIF not found at $MERGED_SARIF"
  GATE_PASS=false
elif ! command -v jq &> /dev/null; then
  echo "✗ ERROR: jq not found — cannot validate merged SARIF"
  GATE_PASS=false
elif ! jq empty "$MERGED_SARIF" 2>/dev/null; then
  echo "✗ ERROR: Merged SARIF is not valid JSON"
  GATE_PASS=false
else
  ERROR_COUNT=$(jq '[.runs[]?.results[]? | select(.level == "error")] | length' "$MERGED_SARIF" 2>/dev/null || echo 0)
  WARNING_COUNT=$(jq '[.runs[]?.results[]? | select(.level == "warning")] | length' "$MERGED_SARIF" 2>/dev/null || echo 0)
  NOTE_COUNT=$(jq '[.runs[]?.results[]? | select(.level == "note")] | length' "$MERGED_SARIF" 2>/dev/null || echo 0)
  echo "Finding summary (repo-wide, informational only — not gating):"
  echo "  error:   $ERROR_COUNT"
  echo "  warning: $WARNING_COUNT"
  echo "  note:    $NOTE_COUNT"
  echo ""
fi

if [ -f "$STATUS_FILE" ]; then
  if grep -q '=error$' "$STATUS_FILE"; then
    echo "✗ ERROR: One or more scanners failed with a genuine execution/configuration error:"
    grep '=error$' "$STATUS_FILE" | sed 's/^/    /'
    GATE_PASS=false
  fi
else
  echo "✗ ERROR: $STATUS_FILE not found — run.sh did not complete"
  GATE_PASS=false
fi

echo ""
if [ "$GATE_PASS" = true ]; then
  echo "✓ Quality gate: PASS (no scanner execution errors)"
  exit 0
else
  echo "✗ Quality gate: FAIL (scanner execution/configuration error — see above)"
  exit 1
fi
