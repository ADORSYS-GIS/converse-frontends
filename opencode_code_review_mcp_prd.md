# PRD: OpenCode-Augmented PR Review Pipeline

## 1. Overview

Build a GitHub Actions–driven code review system around OpenCode that produces stronger, more consistent pull request reviews by combining deterministic static analysis with semantic code retrieval via MCP.

The system is triggered by PR or issue comments such as `/oc` or `/opencode`, prepares review context from automated analysis and repository indexing, then runs OpenCode with structured instructions and tool access.

The goal is to make reviews more accurate, architecture-aware, and actionable while keeping the workflow maintainable, predictable, and cost-efficient.

## 2. Problem Statement

The current OpenCode workflow invokes a model against repository context with limited structured guidance. This creates several problems:

- Reviews may miss deterministic issues already detectable by static analysis.
- Reviews may lack architectural understanding beyond local file context.
- The model may spend time rediscovering code relationships instead of reviewing changes.
- Adding tools ad hoc can make the system harder to reason about and more expensive to run.
- There is no normalized review artifact that explains what automated checks already found.

The project should solve these issues by separating review inputs into two clear classes:

1. **Deterministic evidence** from static analysis.
2. **Exploratory semantic navigation** from a vector-search-backed MCP.

## 3. Product Goal

Create a full review pipeline that enables OpenCode to:

- read a concise, normalized static-analysis summary;
- query a semantic code index through MCP;
- prioritize correctness, security, maintainability, regressions, and codebase consistency;
- avoid repeating raw linter findings unless it adds reviewer value;
- produce higher-signal review comments on pull requests.

## 4. Success Criteria

The project is successful when:

- the GitHub Action can be triggered reliably from PR comments;
- static analysis results are generated and persisted in a predictable format;
- repository code is indexed into a semantic store and exposed through MCP;
- OpenCode receives both the static-analysis summary and MCP access;
- review quality improves in relevance, specificity, and architectural awareness;
- pipeline complexity remains understandable and operable by the team.

## 5. Scope

### In scope

- GitHub Actions workflow orchestration
- Static analysis execution and normalization
- Generation of review artifacts such as `analysis.txt`
- Semantic indexing of repository code
- Vector database integration
- MCP server integration for semantic search
- OpenCode configuration updates
- Review instruction design
- Caching and incremental indexing strategy
- Logging and observability for failures

### Out of scope (initial phase)

- Multi-repository federation
- Full historical knowledge graph of all engineering artifacts
- Autonomous code modification or merging
- Multiple redundant vector backends in production
- Rich UI dashboard for findings
- Sonar MCP integration as a first implementation step

## 6. Users and Stakeholders

### Primary users

- Developers requesting OpenCode reviews in PR threads
- Reviewers using OpenCode as an assistant
- Platform/DevEx engineers maintaining the workflow

### Stakeholders

- Repository maintainers
- Security and quality engineering teams
- Engineering leadership interested in code quality and review efficiency

## 7. Core Product Principles

1. **Logical composition over tool sprawl**: use a small number of focused capabilities.
2. **Deterministic first**: static analysis should provide hard signals before the model reasons.
3. **Semantic retrieval second**: MCP should help the model navigate architecture and relationships.
4. **Low-noise output**: the model should summarize and prioritize, not copy raw scanner output.
5. **Incremental evolution**: start with one vector backend and improve chunking/indexing later.

## 8. Functional Requirements

### FR-1 Triggering

The workflow must trigger when a PR comment or review comment contains `/oc` or `/opencode`.

### FR-2 Repository Access

The workflow must check out the repository with sufficient depth to analyze changed files and optionally compute broader code relationships.

### FR-3 Static Analysis Execution

The workflow must run one or more static analysis tools before invoking OpenCode.

Supported initial analyzers may include:

- SonarQube or SonarCloud
- Semgrep
- ESLint
- type checking (`tsc`, mypy, etc.)
- language-specific linters and analyzers as appropriate

### FR-4 Static Analysis Normalization

The workflow must transform raw analyzer outputs into a concise artifact suitable for LLM consumption.

Minimum required output:

- `.opencode/analysis.txt`

Optional structured outputs:

- `.opencode/analysis.json`
- SARIF files for GitHub-native code scanning

### FR-5 Review Instruction Injection

OpenCode must be configured to read review instruction files and generated analysis artifacts.

At minimum, OpenCode must receive:

- static analysis summary
- project review rules
- optionally repository-specific review heuristics

### FR-6 Semantic Code Indexing

The workflow must create or update a semantic index of repository code using embeddings.

The index must support:

- semantic search by concept
- symbol-aware or file-aware retrieval
- metadata filtering by file path, language, module, or commit
- efficient reuse across runs where feasible

### FR-7 Vector Database Integration

The system must use exactly one vector database backend in the initial implementation.

Preferred option:

- Qdrant

Alternative prototype option:

- ChromaDB

The initial implementation must not require both backends simultaneously.

### FR-8 MCP Integration

The system must expose semantic code retrieval to OpenCode through one MCP server.

The MCP must support:

- indexing or reading indexed content
- semantic retrieval
- optional exact-match symbol/path lookups
- instructions/tool descriptions that guide OpenCode toward code-navigation use cases

### FR-9 Review Execution

OpenCode must run after artifacts and semantic retrieval are available.

The model must be instructed to:

- read `analysis.txt` first;
- use MCP to explore related code and architecture;
- focus on high-signal review comments;
- avoid duplicating low-value static-analysis findings;
- prioritize correctness, security, maintainability, regressions, and consistency.

### FR-10 Output Publication

The workflow must publish review comments back to GitHub through the OpenCode GitHub integration.

### FR-11 Failure Handling

The workflow must fail gracefully when one subsystem is unavailable.

Examples:

- static analysis failure should still allow review if a fallback summary is generated;
- index build failure should still allow a reduced-capability review;
- MCP unavailability should be clearly logged.

### FR-12 Logging and Observability

The workflow must log:

- analyzer execution status
- index build status
- MCP connectivity status
- OpenCode invocation status
- artifact generation status

## 9. Non-Functional Requirements

### NFR-1 Maintainability

The workflow and configuration must remain understandable to repository maintainers, with clear separation of responsibilities across steps.

### NFR-2 Performance

The workflow should minimize cold-start and indexing overhead. Full repository reindexing on every comment should be avoided where possible.

### NFR-3 Cost Efficiency

The system should minimize unnecessary token consumption and embedding churn.

### NFR-4 Determinism

Static analysis artifacts must be reproducible and formatted consistently across runs.

### NFR-5 Security

Secrets must be injected only through GitHub Actions secrets/vars and must not be written to logs or artifacts.

### NFR-6 Extensibility

The architecture should allow later addition of repository documentation retrieval, ADR retrieval, or historical review memory without redesigning the full workflow.

## 10. Feature Set

### Feature A: Static Analysis Summary Builder

A pre-review stage that runs analyzers and writes a compact summary into `analysis.txt`.

#### Capabilities

- Run selected analyzers
- Aggregate findings by severity
- Deduplicate overlapping findings
- Highlight changed files or impacted modules
- Produce a short “suggested focus areas” section for the LLM

#### Example output shape

```text
# Static analysis summary

## High severity
- path/to/file.ext:line issue summary

## Medium severity
- ...

## Tests and quality gates
- lint: passed/failed
- unit tests: passed/failed
- coverage: value

## Suggested focus areas
- auth
- SQL query construction
- retry logic
```

### Feature B: Semantic Code Search via MCP

A semantic retrieval layer that lets OpenCode search the repository beyond local diff context.

#### Capabilities

- retrieve semantically related code
- search by symbol, concept, or behavior
- fetch similar implementations in other modules
- expose metadata such as file path, module, language, and commit SHA

### Feature C: Incremental Indexing

A strategy to avoid rebuilding the full code index on every invocation.

#### Capabilities

- cache index by commit SHA, branch, or PR
- re-index only changed files where possible
- invalidate affected chunks when files move or delete

### Feature D: Review Rules Pack

A repository-owned instruction file that encodes local review preferences.

#### Capabilities

- specify review priorities
- define anti-patterns to watch for
- encode repo conventions
- tell the model how to combine static findings with semantic exploration

### Feature E: Graceful Degradation

The workflow should continue in degraded mode when optional capabilities fail.

#### Degraded modes

- no vector index → static-analysis-only review
- analyzer partial failure → partial summary plus review
- MCP server unavailable → file/instruction-based review only

## 11. Data Inputs

The system will consume:

- repository source code
- diff/PR context from GitHub
- analyzer outputs
- environment secrets and vars
- review instruction files
- embedding model outputs
- vector index metadata

## 12. Data Outputs

### Required outputs

- `.opencode/analysis.txt`
- `opencode.json`
- OpenCode-generated GitHub review comments

### Optional outputs

- `.opencode/analysis.json`
- `.opencode/index-metadata.json`
- SARIF reports
- build logs for analyzers and indexing

## 13. Proposed Architecture

### Stage 1: Trigger and setup

- detect review command in PR comments
- checkout repository
- set bot identity and auth

### Stage 2: Static analysis

- run analyzers
- collect raw findings
- normalize findings into text and JSON artifacts

### Stage 3: Semantic indexing

- start vector store service or connect to a managed instance
- chunk repository code
- create embeddings
- upsert chunks and metadata into the vector store

### Stage 4: MCP exposure

- start or connect to an MCP server backed by the vector store
- verify MCP health
- configure MCP in `opencode.json`

### Stage 5: OpenCode execution

- inject instructions and analysis artifacts
- invoke OpenCode with selected model
- publish comments back to GitHub

## 14. Detailed Requirements for Static Analysis

### Static analysis sources

The system should support one or more of the following:

- SonarQube/SonarCloud for code quality and maintainability
- Semgrep for security and correctness patterns
- language-native linters for syntax/style/type correctness
- test suite summaries for confidence signals

### Normalization requirements

The summary generator must:

- compress noisy output into concise statements;
- preserve severity;
- include file references when possible;
- include quality gate outcomes;
- cap total size to avoid overwhelming the LLM.

### Suggested limits

- target under 150 lines for `analysis.txt`
- prioritize changed files and severe findings first

## 15. Detailed Requirements for Semantic Indexing

### Chunking requirements

Initial implementation may use file or function chunks, but the preferred design is symbol-aware chunking.

Each indexed chunk should include metadata such as:

- file path
- symbol name if available
- language
- module/package
- commit SHA
- chunk type (function, class, file, interface, etc.)

### Retrieval requirements

The MCP-backed retrieval should support:

- nearest-neighbor semantic search
- path-based filtering
- exact name/symbol lookup
- retrieval of neighboring chunks or parent context where necessary

### Index freshness

The system should tie index freshness to repository state, ideally by commit SHA or PR head SHA.

## 16. Proposed Backend Choice

### Recommendation

Use **Qdrant** as the initial vector backend.

### Rationale

- better fit for service-style CI usage
- durable and production-oriented
- clearer path to scaling and shared use
- natural fit with MCP ecosystem

### Alternative

ChromaDB may be used only for local prototyping or extremely lightweight initial experiments.

## 17. MCP Requirements

The MCP server must be logically positioned as a **code search/navigation assistant**, not as a generic memory tool.

### MCP requirements

- exposed in `opencode.json`
- reachable from the GitHub Action runtime
- have clear tool descriptions for code-navigation tasks
- support semantic retrieval against indexed code
- fail fast with visible logs when unreachable

## 18. Review Behavior Requirements

The model should:

- prioritize substantive review comments over stylistic nitpicks;
- connect findings to broader code patterns when relevant;
- validate or challenge static-analysis findings using surrounding code context;
- identify missing tests, unsafe assumptions, coupling, error handling gaps, or regressions;
- avoid repeating obvious linter output unless it improves understanding.

## 19. Acceptance Criteria

### MVP acceptance

- workflow runs on `/oc`
- `.opencode/analysis.txt` is created
- OpenCode reads instruction files successfully
- one MCP-backed semantic search service is configured
- OpenCode can produce review comments in GitHub

### Quality acceptance

- review comments reference actual repository context beyond the changed lines
- comments do not simply restate raw linter output
- severe static-analysis findings are reflected in review focus
- pipeline runtime remains reasonable for normal PRs

### Operational acceptance

- logs are sufficient to debug failures
- secrets are not leaked
- the system can run in degraded mode when indexing or MCP fails

## 20. Risks and Mitigations

### Risk: Too many tools increase noise and cost

**Mitigation:** start with one MCP and one normalized artifact.

### Risk: Full repository indexing is too slow

**Mitigation:** add caching and incremental indexing.

### Risk: Raw analysis output overwhelms the model

**Mitigation:** generate concise summaries instead of dumping logs.

### Risk: Retrieval quality is poor

**Mitigation:** improve chunking and metadata before adding more infrastructure.

### Risk: MCP adds operational fragility

**Mitigation:** support graceful degradation and health checks.

## 21. Rollout Plan

### Phase 1: MVP

- add static analysis stage
- generate `analysis.txt`
- add Qdrant-backed semantic MCP
- update `opencode.json`
- define review rules

### Phase 2: Quality improvements

- symbol-aware chunking
- metadata filters
- incremental indexing
- improved deduplication of static findings

### Phase 3: Extended context

- architecture docs retrieval
- ADR retrieval
- optional past-PR memory or bug-fix retrieval

## 22. Deliverables

- updated GitHub Actions workflow
- `opencode.json` with provider and MCP configuration
- static analysis summarizer script
- code indexing script/service
- MCP deployment/runtime definition
- review instruction file(s)
- operational documentation and troubleshooting notes

## 23. Open Questions

- Which static analyzers are mandatory for the target repository stack?
- Should the vector store run ephemerally inside GitHub Actions or as a shared service?
- What embedding model is preferred for cost vs retrieval quality?
- Should indexing be limited to changed files plus nearby context for early versions?
- What runtime budget is acceptable per `/oc` invocation?

## 24. Recommended MVP Decision

Implement the project with:

- static analysis summary generation into `.opencode/analysis.txt`
- Qdrant as the single vector backend
- one semantic code-search MCP
- repository-specific review instructions
- graceful fallback if indexing or MCP is unavailable

This gives the project a strong, logical architecture without overcomplicating the first version.
