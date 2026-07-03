# Agent Guardrails

> **⚠️ Heavy development:** Not yet published to npm. Expect breakage. The quick start below shows the expected workflow once the package is available.
>
> **What this is:** A pattern-based steering engine for AI coding agent workflows, not a security audit tool or sandbox. See [SECURITY.md](SECURITY.md) for details.

---

[![npm](https://img.shields.io/npm/v/agent-guardrails.svg)](https://www.npmjs.com/package/agent-guardrails)
[![Build](https://img.shields.io/github/actions/workflow/status/nimser/agent-guardrails/ci.yml?branch=main)](https://github.com/nimser/agent-guardrails/actions)
[![Coverage](https://img.shields.io/codecov/c/github/nimser/agent-guardrails)](https://codecov.io/gh/nimser/agent-guardrails)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/agent-guardrails)](https://bundlephobia.com/package/agent-guardrails)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<!-- SonarCloud -->

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nimser_agent-guardrails&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nimser_agent-guardrails)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=nimser_agent-guardrails&metric=coverage)](https://sonarcloud.io/summary/new_code?id=nimser_agent-guardrails)

<!-- /SonarCloud -->

**Keep your agent shipping — not spilling secrets no one's watching for.**

Agent Guardrails steers agents away from costly mistakes instead of just stopping them cold.

### Is this just a set of guards to block bad behaviour?

Blocking is in the toolkit, but it isn't the focus: `suggest` offers a safer command, `run` executes it for the agent, `redact` scrubs a secret before it's ever seen — the agent adapts and keeps working. A hard `block` is still there for when nothing else fits.

### Scenarios

| Agent tries to... | Without | With |
| --- | --- | --- |
| `cat .env` "just to see the setup" | Secret leaks into context | `redact` scrubs it first |
| `git push --force` | Rewrites shared history | `suggest` offers `--force-with-lease` |
| `sops -d secrets.yaml` | Full decrypted secret reaches the LLM | `redact`/`run` returns a sanitized result |
| Reads an untracked `credentials.json` | Silent leak, no rule covers it | Content sniffing catches the secret shape anyway |

## How It Works

```
Agent Tool Call → Match Rules → Resolve Action → Enforce
      ↓               ↓             ↓                   ↓
ToolCallContext   Rule Packs   GuardrailAction   Harness Specific
               (YAML)       + Fallback Chain      Behaviour
```

1. **ToolCallContext** — the adapter normalizes harness-specific events into this common shape
2. **Rule Packs** — match conditions (regex, file-path, predicate) and default actions that define what to watch for
3. **GuardrailAction** — the engine evaluates rules and resolves the action through a fallback chain
4. **Behaviour** — the adapter translates the resolved behaviour (`block`, `suggest`, `run`, `redact`, `confirm`) into harness-specific enforcement

## Features

### Core Engine

- **Multi-layer matching** — substring pre-filter, structural regex, and adversarial wrapper detection
- **Action fallback chain** — `run → suggest → block` when capabilities are missing
- **Harness capability model** — each adapter declares what behaviors its harness supports
- **YAML rule packs** — author guardrails without writing TypeScript
- **Zero runtime dependencies** — the engine itself is pure logic

### Behaviors

| Behavior  | What it does                                       | Phase                   |
| --------- | -------------------------------------------------- | ----------------------- |
| `block`   | Stop the tool call, no alternative                 | before-tool             |
| `suggest` | Stop the call, offer a safer replacement           | before-tool             |
| `run`     | Execute the replacement in the hook, return output | before-tool             |
| `redact`  | Allow the call, sanitize output before LLM sees it | after-tool              |
| `confirm` | Ask the user (native UI, falls back to `block`)    | before-tool             |

### Built-in Rule Packs

- **env** — Block `.env` file reads (both file-path and bash commands) (_upcoming_)
- **private-key** — Block private key access, including SSH directory files (_upcoming_)
- **secret-managers** — Block 1Password, gopass, pass, and Bitwarden secret retrieval (_upcoming_)
- **encryption-tools** — Block `age`, `gpg`, and `openssl` decrypt commands (_upcoming_)
- **sops** — Block SOPS decrypt operations (_upcoming_)
- **hardening** — Detect shell wrappers (`eval`, `bash -c`, `$()`) and redirects to sensitive paths (_upcoming_)
- **direnv**, **kubernetes**, **gh-cli** — Platform-specific guardrails (_upcoming_)

### Adapters

- 🚧 **Pi** — native plugin for [Pi](https://github.com/earendil-works/pi) — WIP
- 🚧 **OpenCode** — native plugin for [OpenCode](https://github.com/anomalyco/opencode) — WIP
- 🚧 **Codex** — coming later
- 🚧 **Claude Code** — coming later
- 🔌 **Community adapters welcome** — from v0.2.0 onwards, any harness can integrate by implementing a thin adapter shim

### Per-Adapter Capability Table (design target)

Source-verified per [ADR-002](docs/adrs/002-behavior-model.md) /
[ADR-007](docs/adrs/007-trust-and-self-protection.md). Unsupported behaviors degrade
via the [fallback chain](#fallback-chains).

| Harness | `run` | `redact` | `confirm` | `tamperResistant` | `haltTurnBeforeTool` | `haltTurnAfterTool` |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Pi | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| OpenCode | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Claude Code | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Codex | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |

### Harness Authors: Embed the Engine

The engine (`matchAndResolve` / `processMatch`) is a pure function with a stable
public API ([ADR-003](docs/adrs/003-public-api-contract.md)). Import it directly as
your harness's permission-system implementation instead of writing rule matching from
scratch:

```typescript
import { matchAndResolve, PredicateRegistry, StatsTracker } from "agent-guardrails";

const registry = new PredicateRegistry();
const stats = new StatsTracker();
const action = matchAndResolve(ctx, packs, myHarnessCapabilities, registry, stats);
```

You own the adapter glue; the engine owns matching, resolution, and fallback. See
ADR-003's Adapter Bootstrap Pattern for the full pattern.

## Quick Start

> Not yet published. The workflow below shows the expected v0.1.0 experience.

```bash
npx agent-guardrails install pi
```

That's it. Try `cat .env` in your agent — it should be blocked.

To build from source today, see [Getting Started](docs/getting-started.md).

## Architecture

Single package with strict layered directories. Dependency direction flows downward only:

```
src/
  core/           Types, validation. ZERO runtime dependencies.
  matcher/        Rule matching (match conditions + command splitter). Imports core/ only.
  resolver/       Action resolution, fallback chains. Imports core/ only.
  engine/         Pure-function orchestrator. Imports core/, matcher/, resolver/. The `PredicateRegistry` and `StatsTracker` are passed as arguments.
  infrastructure/ → I/O boundary (YAML loading). The ONLY layer with external deps.
```

**Import rules** (hard constraints):

- `core/` imports nothing
- `matcher/` and `resolver/` import `core/` only
- `engine/` imports `core/`, `matcher/`, `resolver/` (never `infrastructure/`)
- `infrastructure/` imports `core/` only
- The `yaml` npm package (v2.4.0) is used ONLY in `infrastructure/yaml-pack-loader.ts`

### Fallback Chains

When a harness lacks a capability, the engine walks a deterministic chain:

- `run → suggest → block`
- `confirm → block` (or via `action.fallback` if defined — see [ADR-002](docs/adrs/002-behavior-model.md))
- `redact → block`
- `suggest → block` (when no replacement available)

Implemented in `src/resolver/action-resolver.ts`. Adapters declare `HarnessCapabilities`; the engine handles the rest.

### Matching Layers

Three-layer defense-in-depth:

- **L1** Substring pre-filter — fast scan, catches wrappers
- **L2** Structural regex — precise, configured behavior
- **L3** Wrapper detection (`eval`, `bash -c`, `$()`) — triggers force-block

L1+L3 match = force-block regardless of L2 (adversarial pattern detected).

## Vocabulary

| Term            | Meaning                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| Rule            | Detection pattern + phase + default action                                     |
| Rule Pack       | Named collection of rules (YAML or TypeScript)                                 |
| Behavior        | Category: block/suggest/run/redact/confirm                                     |
| Action          | Concrete response object (e.g., a suggest action with replacement + message)   |
| Phase           | When a rule fires: before-tool or after-tool                                   |
| ToolCallContext | Normalized input from a harness (discriminated union on `toolName`)            |
| Adapter         | Integration shim for a specific harness (Pi, OpenCode, etc.)                   |
| Harness         | The platform (Pi, OpenCode). NOT the agent (the AI model).                     |
| Fallback Chain  | Deterministic degradation when a harness lacks a capability                    |
| Matcher         | User-facing name for a match condition: bash-command (regex), file-path (regex), or predicate (TypeScript function). Internally represented as a `MatchCondition` discriminated union. |
| Match Condition | A rule's `match` field — a declarative spec that the engine evaluates via `matchesMatcher()`. Type alias: `MatchCondition`. |
| Default Decision | The default action of the implicit catch-all rule that fires when nothing else matches (`allow \| suggest \| confirm \| block`, default `allow`). See [ADR-007](docs/adrs/007-trust-and-self-protection.md). |
| Overridable | Rule-level flag; `false` locks a built-in rule against user config overrides. Not available to community packs. See [ADR-007](docs/adrs/007-trust-and-self-protection.md). |
| Tamper-Resistant | Adapter capability declaring whether it runs as an external hook process (harder to tamper with) vs. an in-process plugin. See [ADR-007](docs/adrs/007-trust-and-self-protection.md). |
| Turn Halt | `haltTurn` modifier on `block`/`redact` actions that stops the agent's current turn, not the session. See [ADR-002](docs/adrs/002-behavior-model.md). |

Do not confuse: Behavior (category) vs Action (concrete object); RulePack (domain concept) vs package (npm artifact); Harness (platform) vs Agent (AI model).

## Documentation

- [Getting Started](docs/getting-started.md) — contributor gateway, architecture overview, key vocabulary
- [Architecture Decisions (ADRs)](docs/adrs/) — the _why_ behind core design choices
- [How Matching Works](docs/how-matching-works.md) — layer-by-layer walkthrough with real examples
- [Rule Pack Guide](docs/rule-pack-guide.md) — complete YAML format spec, action types, defense-in-depth tips

## Contributing

We welcome rule packs, adapters, and engine improvements. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started — the lowest-friction way to contribute is creating and sharing a YAML rule pack.

## License

MIT — see [LICENSE](LICENSE).
