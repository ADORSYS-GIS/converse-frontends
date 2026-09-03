# Getting started — the agent setup in this repo

For building and running the apps, read [`README.md`](README.md). This file describes how AI
coding assistants are wired up here, whichever one you use.

## One entry point

**[`AGENTS.md`](AGENTS.md)** is the definitive source for standards, architecture, and the index of
skills, agents and knowledge pages. Read its §0 first.

Everything else is a **committed relative symlink** into `AGENTS.md` or `.claude/`. Git stores
symlinks natively (mode `120000`), so nothing is duplicated and nothing can drift:

| Harness                  | File it reads                                   | What it is            |
| ------------------------ | ----------------------------------------------- | --------------------- |
| Claude Code              | `CLAUDE.md`, `.claude/skills`, `.claude/agents` | the originals         |
| VS Code / GitHub Copilot | `.github/copilot-instructions.md`               | symlink → `AGENTS.md` |
| OpenCode                 | `AGENTS.md`, `.claude/skills`                   | read natively         |
| Antigravity / Gemini     | `GEMINI.md`, `.agents/skills/*`                 | symlinks              |
| Cursor                   | `AGENTS.md` (and legacy `.cursorrules`)         | native + symlink      |
| Windsurf                 | `.windsurfrules`                                | symlink → `AGENTS.md` |
| Roo Code                 | `.roo/rules/project-rules.md`                   | symlink → `AGENTS.md` |
| Kilo Code                | `.kilocode/rules/project-rules.md`              | symlink → `AGENTS.md` |

Full reasoning, what is deliberately **not** linked, and the Windows `core.symlinks` caveat:
[`docs/knowledge/agent-harnesses.md`](docs/knowledge/agent-harnesses.md).

## Skills

Reusable task recipes with the exact commands, the verification bar, and the pitfalls that have
actually cost time here. Each lives at `.claude/skills/<name>/SKILL.md`.

Repo-specific: `console-ui`, `dashboard-panel`, `console-story-verify`, `i18n-copy`,
`report-template`, `authz-schema-sync`, `console-release-verify`, `governance-pr`.

Generic: `ci-cd`, `containerization`, `debugging`, `documentation`, `pr-review`, `refactoring`,
`testing`.

## Agents

Role definitions at `.claude/agents/<name>.md`: `console-ui-builder`, `dashboard-author`,
`console-verifier` (read-only), `docs-curator`.

## Knowledge base

`docs/knowledge/` holds **contracts and how-tos**, verified against the tree with `file:line`
citations and a mermaid pair per process. `docs/adr/` holds the **decisions** and the alternatives
that were rejected. Knowledge pages link the ADRs rather than restating them.

## MCP servers

Configured in `.claude/settings.json`: `github`, `context7`. Refer to each server's own
documentation to install it.

## Verify the setup

```bash
# every harness pointer is a symlink, not a copy
git ls-files -s .agents .cursorrules .windsurfrules GEMINI.md \
  .github/copilot-instructions.md .roo/rules .kilocode/rules
#   every row must start with mode 120000

# the skills and agents are where the index says
ls .claude/skills .claude/agents

# each linked skill resolves
ls .agents/skills/console-ui/SKILL.md
```

If any of those rows shows `100644`, a generator or an editor replaced a symlink with a file —
re-link it before committing. See `agentic-config.conf` in
[`docs/knowledge/agent-harnesses.md`](docs/knowledge/agent-harnesses.md).
