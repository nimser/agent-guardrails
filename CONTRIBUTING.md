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

See existing packs in `src/packs/` for the format. Browse the [Future Secret Packs](docs/future-secret-packs.md) backlog for ideas — AWS, Terraform, Vault, Azure CLI, GCP CLI, database CLIs, and more.

**Sharing your rule packs:** Once accepted, community rule packs are curated in the companion repo [awesome-agent-guardrails](https://github.com/nimser/awesome-agent-guardrails). We'll feature useful packs there for others to discover.

### 🟡 Medium Effort: New Adapters

Want to add support for another AI coding harness? Adapters are thin shims:
1. Normalize the harness event → `ToolCallContext`
2. Call `matchAndResolve()` from the engine
3. Translate the result back to the harness's native mechanism

See the existing Pi and OpenCode adapters (specs in `openspec/changes/`) for the pattern. Community adapters for Codex, Claude Code, Aider, and others are welcome starting at v0.2.0.

### 🔴 Deeper Work: Engine Improvements

Changes to the matcher registry, resolver, action fallback chain, or type system require more context. Read the specs in `openspec/changes/` first, and feel free to open an issue to discuss your approach before diving in.

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

The `openspec/changes/` directory contains design proposals and specifications for past and planned changes. These are working documents — they capture the author's thinking and intended direction but should not be treated as immutable specs. The source of truth is the code and tests.

For deeper architectural context, see:
- [Matching Strategy](docs/matching-strategy.md)
- [YAML Rule Packs](docs/yaml-rule-packs.md)
- [Future Secret Packs](docs/future-secret-packs.md)
- `UBIQUITOUS_LANGUAGE.md` — domain terminology

## Reporting Security Issues

See [SECURITY.md](SECURITY.md).
