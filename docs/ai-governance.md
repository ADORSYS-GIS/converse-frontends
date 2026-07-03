# AI Governance Integration

This repository is integrated with the ADORSYS-GIS AI Governance kit.

Canonical source of truth: https://adorsys-gis.github.io/ai-governance/

## Integrated Files

The repo carries the governance issue and pull request artifacts:

- `.github/ISSUE_TEMPLATE/epic.yml`
- `.github/ISSUE_TEMPLATE/user-story.yml`
- `.github/ISSUE_TEMPLATE/dev-ticket.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/governance.yml`
- `.github/workflows/opencode.yml`
- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `CONTRIBUTING.md`

The GitHub labels required by the issue forms are present:

- `epic`
- `user-story`
- `ticket`

## Required Human Gates

Every issue and PR must preserve intent, source evidence, verification evidence, and human accountability.

Work is ready only when:

- intent is clear;
- a source of truth is linked;
- scope and out-of-scope are explicit;
- acceptance criteria are testable;
- assumptions and risks are documented;
- AI-generated content has been reviewed by a human.

Work is done only when:

- acceptance criteria are satisfied;
- relevant checks or tests are run;
- manual verification evidence is attached when applicable;
- security and operational impacts are considered;
- a human owner accepts responsibility.

## Pull Request Enforcement

`.github/workflows/governance.yml` calls the reusable governance check from `ADORSYS-GIS/ai-governance`.

The check is pinned to the governance `v1.0.0` commit:

```text
959d8565041ddef86d3a10001b64393a6d4a60a2
```

It fails PRs whose body does not include:

- an AI Usage Declaration;
- a source-of-truth reference;
- verification evidence.

## OpenCode Review Integration

`.github/workflows/opencode.yml` is the thin caller for the reusable OpenCode review workflow in `ADORSYS-GIS/ai-governance`.

It is pinned to:

```text
dc83d40d3dd36e53105a7b8c0f4af8946d9d4a58
```

The workflow runs only when `OPENCODE_GATEWAY_AUDIENCE` is set as a repository or organization variable. Without that variable it is intentionally a no-op.

Required external setup:

- install the `camer-digital-ai` GitHub App for the repository or organization;
- have the organization approved in the AI gateway;
- set `OPENCODE_GATEWAY_AUDIENCE` to the provided Source audience URL.

## Maintenance

When the governance kit changes, compare this repository against `ADORSYS-GIS/ai-governance/templates`.

Updates should be deliberate:

- preserve repo-specific rules in `AGENTS.md`;
- keep workflow callers pinned to immutable commits;
- update this document with the new pinned commit;
- include verification evidence in the PR body.
