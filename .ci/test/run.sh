#!/usr/bin/env bash
#
# The unit-test gate: run EVERY workspace's `test` script, then prove every one of them ran.
#
# Why this exists (converse-frontends#504's fallout, found while hotfixing #506). The job used to
# be a bare `pnpm test`, and pnpm's recursive runner BAILS on the first failing package. Package
# order is `apps/*` then `packages/*`, alphabetically — so a single broken suite in `apps/lci`
# meant `apps/console`'s ~1490 tests never executed at all, in any run, on any PR. The check went
# red for the right reason and stayed silent about everything it had skipped, which is the worst
# shape a gate can have: it looks like one failure and is actually N unknowns.
#
# Two things fix that, and both are needed:
#
#  1. `--no-bail` (now baked into the root `test` script, so a developer's local `pnpm test` behaves
#     identically): every package runs, and the recursive command still exits non-zero if any of
#     them failed.
#  2. This wrapper, which lists the packages that were SUPPOSED to run and checks each one against
#     the log. `--no-bail` alone would still let a package silently vanish from the run — a broken
#     filter, a `test` script dropped in a refactor, a workspace glob that stopped matching — and a
#     gate that runs zero suites passes just as green as one that runs all of them.
#
# The per-package verdict comes from pnpm's own recursive output, which prefixes every line with
# the package DIRECTORY and ends each package with `Done` or `Failed`:
#
#     apps/console test: Test Files  118 passed (118)
#     apps/console test: Done
#     apps/lci test: Failed
#
# Anything else for an expected package — no marker at all — means it did not run, and that is a
# hard failure here even if pnpm itself exited 0.
#
# Writes a per-package table to $GITHUB_STEP_SUMMARY when running under Actions, and to stdout
# always. Exit code: 0 only when every expected package ran AND passed.

set -uo pipefail

LOG="$(mktemp -t pnpm-test-log.XXXXXX)"
trap 'rm -f "$LOG"' EXIT

# ── 1. The packages that must run ────────────────────────────────────────────────────────────────
# Read from pnpm's own workspace enumeration rather than a hand-kept list — the same reasoning
# test.yml's `typecheck` job gives for discovering tsconfigs instead of naming workspaces. A second
# hardcoded list of "which packages have tests" is exactly the duplicate-list trap that has bitten
# this repo's release scripts before.
#
# `while read` rather than `mapfile`: macOS still ships bash 3.2, and this script is meant to be
# runnable by hand on a developer's laptop, not only on the Ubuntu runner.
expected=()
while IFS= read -r line; do
  [ -n "$line" ] && expected+=("$line")
done < <(
  # The `${...}` below are JavaScript template literals evaluated by node; single quotes are
  # exactly what keeps the shell out of them.
  # shellcheck disable=SC2016
  pnpm list -r --depth -1 --json | node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      const root = process.cwd();
      for (const project of JSON.parse(raw)) {
        if (!project.path || project.path === root) continue;
        const manifest = path.join(project.path, "package.json");
        if (!fs.existsSync(manifest)) continue;
        const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
        if (!pkg.scripts || !pkg.scripts.test) continue;
        // `<workspace-relative dir>\t<package name>` — the dir is what pnpm prefixes its output
        // with; the name is what a human reads in the summary.
        console.log(`${path.relative(root, project.path)}\t${pkg.name ?? project.name}`);
      }
    });
  ' | sort
)

if [ "${#expected[@]}" -eq 0 ]; then
  echo "::error::No workspace package declares a \`test\` script — the unit-test gate would be a no-op"
  exit 1
fi

echo "=== Unit tests: ${#expected[@]} workspace packages ==="
printf '  %s\n' "${expected[@]}"
echo ""

# ── 2. Run them all ──────────────────────────────────────────────────────────────────────────────
# `pnpm test` at the root is `pnpm -r --no-bail --if-present run test`. Called through the root
# script on purpose: the flag a developer gets locally and the flag CI gets are then the same
# string in the same place, and cannot drift.
pnpm test 2>&1 | tee "$LOG"
run_status="${PIPESTATUS[0]}"

# ── 3. Prove each one ran ────────────────────────────────────────────────────────────────────────
rows=()
missing=0
failed=0

for entry in "${expected[@]}"; do
  dir="${entry%%$'\t'*}"
  name="${entry##*$'\t'}"
  if grep -qxF "$dir test: Failed" "$LOG"; then
    rows+=("| \`$name\` | \`$dir\` | ❌ failed |")
    failed=$((failed + 1))
  elif grep -qxF "$dir test: Done" "$LOG"; then
    rows+=("| \`$name\` | \`$dir\` | ✅ passed |")
  else
    rows+=("| \`$name\` | \`$dir\` | ⚠️ DID NOT RUN |")
    missing=$((missing + 1))
    echo "::error::\`$name\` ($dir) declares a \`test\` script but produced no result — it never ran"
  fi
done

{
  echo "## Unit tests"
  echo ""
  echo "Every workspace package with a \`test\` script, run with \`--no-bail\` so one failure never"
  echo "hides the rest (converse-frontends#504 fallout)."
  echo ""
  echo "| Package | Path | Result |"
  echo "| --- | --- | --- |"
  printf '%s\n' "${rows[@]}"
} | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"

echo ""
if [ "$missing" -ne 0 ]; then
  echo "✗ $missing package(s) declared a test script but never ran — failing the gate."
  exit 1
fi
if [ "$failed" -ne 0 ] || [ "$run_status" -ne 0 ]; then
  echo "✗ $failed package(s) failed (pnpm exit $run_status)."
  exit 1
fi

echo "✓ all ${#expected[@]} package(s) ran and passed."
