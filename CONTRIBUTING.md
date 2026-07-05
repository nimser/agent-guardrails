# Contributing to Agent Guardrails

Welcome! This project is designed to be easy to contribute to. Whether you're adding a rule pack, building an adapter, or improving the engine — here's how to get started.

## Quick Setup

```bash
git clone https://github.com/nimser/agent-guardrails.git
cd agent-guardrails
npm install
```

## Available Commands

```bash
npm test              # Run all tests
npm test:watch        # Watch mode
npm run build         # Compile to dist/
npm run typecheck     # TypeScript check only
npm run lint          # Run oxlint (type-aware)
npm run format        # Format code with oxfmt
npm run check         # Full gate: lint + format + typecheck
```

A pre-commit hook (installed via the code-style skill) runs `format` then `check` before every commit. Bypass with `git commit --no-verify` if needed — but the CI workflow will still enforce the gate.

## What You Can Contribute

### 🟢 Lowest Barrier: YAML Rule Packs

The easiest way to contribute is writing a YAML rule pack. No TypeScript required. Define matchers and actions in a `.yaml` file and submit it.

- **Format & schema:** [Rule Pack Guide](docs/rule-pack-guide.md)
- **Examples:** Built-in packs in `src/packs/`
- **How matching works:** [How Matching Works](docs/how-matching-works.md) — understand the three detection layers before writing patterns

Ideas for new packs: AWS SSM/Secrets Manager, Terraform, HashiCorp Vault, database CLIs, Azure CLI, GCP CLI. Pick whichever your team uses most — likelihood of encounter matters more than completeness.

**Sharing your rule packs:** Once accepted, community rule packs are curated in the companion repo [awesome-agent-guardrails](https://github.com/nimser/awesome-agent-guardrails). We'll feature useful packs there for others to discover.

### 🟡 Medium Effort: New Adapters

Want to add support for another AI coding harness? Adapters are thin shims:

1. Normalize the harness event → `ToolCallContext`
2. Call `engine.evaluate()` from the public API
3. Translate the result back to the harness's native mechanism

The first-party Pi and Claude Code adapters show the pattern. Adapters for other harnesses (OpenCode, Codex, Aider, …) are community-owned and live outside this repo, built against the stable interface ([ADR-009](docs/adrs/009-adapter-scope-and-tiering.md)).

### 🔴 Deeper Work: Engine Improvements

Changes to the matcher registry, resolver, action fallback chain, or type system require more context. Start with the [Architecture Decisions](docs/adrs/) (read in order), then open an issue to discuss your approach before diving in.

## Code Style

- TypeScript strict mode, no `any`, no `!` non-null assertions
- Named exports only — no default exports
- JSDoc on public package exports
- Format with oxfmt (single quotes, no semicolons, 100 char print width)
- Colocate tests: `file.test.ts` next to `file.ts`

The linter and formatter will catch most issues automatically.

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Tests required for new logic
- Reference the relevant spec in `openspec/changes/` if applicable
- Mention whether you used an AI coding assistant (see PR template)

## Design Context

For architectural reasoning, see the docs in this repo:

- **[Getting Started](docs/getting-started.md)** — contributor gateway, key vocabulary, architecture at a glance
- **[Architecture Decisions (ADRs)](docs/adrs/)** — the _why_ behind core design choices (read in order 1–5)
- **[How Matching Works](docs/how-matching-works.md)** — layer-by-layer matching with real command examples
- **[Rule Pack Guide](docs/rule-pack-guide.md)** — complete YAML format spec and action types

The source of truth is the code and tests. If a doc and the code disagree, trust the code — and please open an issue so we can fix the doc.

## Reporting Security Issues

See [SECURITY.md](SECURITY.md).
