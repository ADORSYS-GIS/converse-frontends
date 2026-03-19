# Review Rules
# Repository Review Conventions

## Critical Constraints
- **IGNORE ALL CHANGES** in `.opencode/` directory and `opencode.json`. These are CI-generated artifacts.
- **IGNORE ALL CHANGES** in `charts/` directory unless the PR description specifically requests a Helm chart review.
- **Focus** your review on `apps/self-service` and `packages/*`.
- **Secrets**: Never allow hardcoded secrets. Flag any string that looks like a key or token.

## Priority 1: Architecture & Work Method
Follow the [AGENTS.md](file:///home/runner/work/converse-frontends/converse-frontends/AGENTS.md) strictly:
 in app pages: no direct `react-native` imports in screens/views
- All classnames inside UI components via `cva` + `cn`, never raw className in app code
- Theme tokens only: no hardcoded colors (`bg-[#...]`, `text-white`, etc.)
- All visible text via i18n `t('key')`, no literal user-facing strings
- Kebab-case filenames for all new files
- Hooks in `packages/hooks`, API logic in `packages/api-rest` or `packages/api-native`

## Priorities (in order)
1. Correctness and logic errors
2. Security vulnerabilities
3. Regressions and breaking changes
4. Missing error handling
5. Maintainability and code quality
6. Architecture consistency (see AGENTS.md)

## Architecture Conventions
- UI-only in app pages: no direct `react-native` imports in screens/views
- All classnames inside UI components via `cva` + `cn`, never raw className in app code
- Theme tokens only: no hardcoded colors (`bg-[#...]`, `text-white`, etc.)
- All visible text via i18n `t('key')`, no literal user-facing strings
- Kebab-case filenames for all new files
- Hooks in `packages/hooks`, API logic in `packages/api-rest` or `packages/api-native`
- Routes in `apps/self-service/src/app` (Expo Router, file-based)
- UI components use folder structure: `cva.tsx`, `types.tsx`, `component.tsx`, `index.tsx`

## Anti-patterns to Watch For
- Direct `react-native` imports in app views/screens
- Raw `className` props passed from app-level code
- Hardcoded color values in classnames
- Literal user-visible strings (not wrapped in `t()`)
- Default exports in packages (unless required by framework)
- Missing `workspace:*` for internal dependencies

## How to Use Static Analysis
- Read `.opencode/analysis.txt` FIRST before reviewing code
- Do NOT repeat raw linter output verbatim
- Use analysis findings to focus review on high-signal areas
- Validate or challenge static findings using surrounding code context
- If analysis.txt is empty or missing, note it and proceed with manual review

## How to Use Semantic Search
- Use the `code_search` MCP tools to explore related code beyond the diff
- Look for existing patterns, conventions, and similar implementations
- Verify that changes are consistent with codebase conventions
- Search for related tests, error handling, and edge cases
- Use `search_code` with queries like "authentication", "error handling pattern", etc.
