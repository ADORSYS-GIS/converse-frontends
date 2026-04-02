---
name: install-uv
description: Install uv and uvx on the host machine for local OpenCode and MCP workflows.
compatibility: opencode
metadata:
  audience: maintainers
  runtime: host
---

## What I do

- Detect whether `uv` and `uvx` are already available on the host.
- Install `uv` using Astral's official installer when missing.
- Verify the resulting host binaries with `uv --version` and `uvx --version`.
- Keep local MCP workflows on host-managed `uvx` instead of replacing them with ad hoc package installers.

## When to use me

Use this when a local OpenCode workflow depends on `uv` or `uvx`, especially for `.opencode/scripts/start-code-search.sh` and other host-side MCP startup scripts.

## Workflow

1. Check `command -v uv` and `command -v uvx`.
2. If either command is missing, install `uv` with Astral's official installer:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

3. Ensure the installer-added bin directory is available in the current shell.
4. Verify:

```bash
uv --version
uvx --version
```

## Constraints

- Install on the host, not inside project files or a throwaway container.
- Prefer the official installer over custom package-manager-specific workarounds.
- Do not modify unrelated project configuration when installing `uv`.
