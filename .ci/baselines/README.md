# Quality Baselines & Suppressions

This directory contains approved exceptions, suppressions, and baseline findings for the quality pipeline.

## Purpose

Baselines allow the team to:
- Accept unavoidable technical debt or false positives with full documentation
- Track the reason and expiration date for each suppression
- Prevent repeated reporting of known, non-actionable findings
- Maintain a clean quality gate focused on new, actionable issues

## Files

### `.semgrep.json`

Semgrep findings that have been reviewed and approved for suppression.

**Format:**
```json
[
  {
    "ruleId": "typescript.security/sql-injection-template",
    "filePath": "apps/self-service/src/db/query.ts",
    "expiresAt": "2026-12-31",
    "reason": "Query parameterization verified; false positive due to template string interpolation with safe values",
    "reviewedBy": "author@example.com",
    "ticket": "#123"
  }
]
```

**Fields:**
- `ruleId`: Semgrep rule identifier (from rule YAML)
- `filePath`: Repository-relative file path
- `expiresAt`: ISO 8601 date when suppression should be revisited (required)
- `reason`: Human-readable explanation (required)
- `reviewedBy`: Email of reviewer (optional)
- `ticket`: GitHub issue or PR reference (optional)

**Adding a suppression:**
1. Review the finding in the Semgrep report or PR comment
2. Verify it is a false positive or acceptable exception
3. Add entry to this file with reason and expiration date (typically 6–12 months from now)
4. Commit both the PR and this baseline update together

### `.gitleaks-secrets.json`

Secrets or credential patterns that have been reviewed and are not true leaks.

**Format:**
```json
[
  {
    "pattern": "sk_test_...",
    "filePath": "packages/api-rest/src/__fixtures__/stripe-responses.json",
    "expiresAt": "2026-12-31",
    "reason": "Test fixture with Stripe test-mode key (non-sensitive, public examples)",
    "ticket": "#456"
  }
]
```

**Note:** This baseline is managed by the security workflow (ai-ops/security-gates.yml) and should be updated there, not here. This file is for reference only.

### `.runner-provisioning.md`

Documentation for tools and dependencies that must be pre-provisioned on the self-hosted runner.

**See:** Runner setup instructions in the Ansible playbook or provisioning script.

## Expiration Policy

Suppressions **must** include an `expiresAt` date. This forces periodic review:

- **6 months**: For false positives or temporarily unavoidable issues
- **12 months**: For longer-term technical debt that will be addressed in a future sprint
- **Never "permanent"**: If an issue will never be fixed, close it as won't-fix or escalate

On or before the expiration date:
1. Re-run the scanner
2. Check if the underlying issue has been fixed
3. Either remove the suppression or update the expiration date with a new reason

## Inline Suppressions (Preferred)

Where possible, use the scanner's native inline suppression syntax instead of this file:

**ESLint:**
```typescript
// eslint-disable-next-line no-unsafe-optional-chaining
const x = obj?.method?.();
```

**TypeScript:**
```typescript
// @ts-ignore — Type guard is runtime-only
const isString = (x): x is string => typeof x === 'string';
```

**Prettier:**
```typescript
// prettier-ignore
const reallyLongFormattedString = 'this will not be reformatted';
```

**Semgrep (when inline suppression not available):**
Add to this `.semgrep.json` file.

## Reviewing Baselines

Periodically review suppressions to ensure they are still valid:

```bash
# List all active suppressions
cat .ci/baselines/.semgrep.json | jq '.[] | {ruleId, filePath, expiresAt}'

# Identify expiring suppressions (due within 30 days)
# (Manual check; recommend adding to PR review checklist)
```

## Repository Policy

- **New findings:** Never suppress without PR review and an approved issue or ticket
- **False positives:** Must be reported upstream to the scanner project if applicable
- **Real findings:** Fix in preference to suppressing
- **Unavoidable debt:** Document thoroughly with ticket and expiration date
