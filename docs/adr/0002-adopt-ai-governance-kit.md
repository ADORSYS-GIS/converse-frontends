# ADR 0002: Adopt AI Governance kit for delivery artifacts

## Status

Accepted

## Context

The repository already depends on AI-assisted delivery, code review, and issue preparation. Without a local governance contract, AI can produce polished tickets, pull requests, summaries, and review comments that look complete but do not preserve intent, evidence, or accountability.

The canonical source of truth is the ADORSYS-GIS AI Governance kit:

- https://adorsys-gis.github.io/ai-governance/
- https://github.com/ADORSYS-GIS/ai-governance

The governance doctrine requires humans to own intent, verification, and consequences. It also requires tickets and PRs to link source evidence, declare AI usage, and attach verification evidence.

## Decision

This repository adopts the AI Governance kit as a repo-level delivery control.

The integration includes:

- structured GitHub issue forms for epics, user stories, and development tickets;
- blank issues disabled;
- a governance pull request template;
- the reusable AI Governance PR check;
- a reusable OpenCode review caller;
- AI governance stanzas in agent instruction files;
- contributor documentation and a repo-local integration guide.

The governance PR check remains deterministic and blocking. AI review remains advisory and must not replace human judgment.

Workflow callers are pinned to immutable commits. The governance gate is pinned to `v1.0.0` at `959d8565041ddef86d3a10001b64393a6d4a60a2`. The OpenCode reusable review workflow is pinned to `dc83d40d3dd36e53105a7b8c0f4af8946d9d4a58`.

## Consequences

Every new issue must provide a source of truth, acceptance criteria or success criteria, AI usage declaration, verification expectations, and a human accountable owner.

Every pull request must include AI usage, source-of-truth, and verification evidence before the governance check can pass.

Maintainers must keep local governance files synchronized deliberately with `ADORSYS-GIS/ai-governance/templates`. Updates must preserve repository-specific engineering rules in `AGENTS.md` and must not replace human review with AI review.

OpenCode reviews require external organization setup through the `camer-digital-ai` GitHub App and `OPENCODE_GATEWAY_AUDIENCE`. If the variable is not set, the workflow is intentionally disabled.
