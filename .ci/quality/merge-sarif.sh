#!/usr/bin/env bash
set -euo pipefail

# SARIF merger
# Combines individual SARIF reports into a single quality.sarif
# Handles missing/empty reports gracefully

REPORTS_DIR=".ci/quality/reports"
OUTPUT_FILE="$REPORTS_DIR/quality.sarif"

echo "Merging SARIF reports..."

# Collect all SARIF files (excluding the merged output itself)
SARIF_FILES=()
for f in "$REPORTS_DIR"/*.sarif; do
  if [ -f "$f" ] && [ "$(basename "$f")" != "quality.sarif" ]; then
    # Only include non-empty SARIF files
    if [ -s "$f" ]; then
      SARIF_FILES+=("$f")
    fi
  fi
done

if [ ${#SARIF_FILES[@]} -eq 0 ]; then
  echo "No SARIF reports found. Creating empty merged report."
  cat > "$OUTPUT_FILE" << 'EOF'
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "quality-pipeline",
          "version": "1.0.0",
          "informationUri": "https://github.com/adorsys-gis/converse-frontends"
        }
      },
      "results": []
    }
  ]
}
EOF
  echo "Merged SARIF created: $OUTPUT_FILE (empty)"
  exit 0
fi

# If only one SARIF file exists, just copy it
if [ ${#SARIF_FILES[@]} -eq 1 ]; then
  cp "${SARIF_FILES[0]}" "$OUTPUT_FILE"
  echo "Merged SARIF created: $OUTPUT_FILE (1 source)"
  exit 0
fi

# Multiple SARIF files: merge them with jq
# This is a simple concatenation; a production system might deduplicate by (tool, ruleId, location)
node .ci/quality/scripts/merge-sarif.js \
  "${SARIF_FILES[@]}" \
  > "$OUTPUT_FILE"

echo "Merged SARIF created: $OUTPUT_FILE (${#SARIF_FILES[@]} sources)"
