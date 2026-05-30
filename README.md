# Agent Guardrails

> **Security disclaimer:** Agent Guardrails is a pattern-based policy engine, not a security audit tool. It provides defense-in-depth for AI coding agent workflows but should not be treated as a complete security boundary. Deterministic regex matching cannot catch every adversarial payload. Combine with network controls, credential scanning, and human review for sensitive environments. See [SECURITY.md](SECURITY.md) for details.

---

[![npm](https://img.shields.io/npm/v/agent-guardrails.svg)](https://www.npmjs.com/package/agent-guardrails)
[![Build](https://img.shields.io/github/actions/workflow/status/nimser/agent-guardrails/ci.yml?branch=main)](https://github.com/nimser/agent-guardrails/actions)
[![Coverage](https://img.shields.io/codecov/c/github/nimser/agent-guardrails)](https://codecov.io/gh/nimser/agent-guardrails)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Policy engine for AI coding agents.** Intercept tool calls before they execute, match them against rule packs, and enforce guardrails — block, suggest safer alternatives, or redact output.

Your agent shouldn't read `.env` files, decrypt secrets, or exfiltrate private keys. Agent Guardrails stops it before it happens.

## How It Works

```
Agent Tool Call → Normalize → Match Rules → Resolve Action → Enforce
                     ↑             ↑              ↑              ↑
              ToolCallContext  Rule Packs    Fallback      Harness-Specific
                             (YAML or TS)    Chain         Block/Suggest
```

1. **Adapters** normalize harness-specific events into a common `ToolCallContext`
2. **Rule Packs** define matchers (regex, file-path, predicate) and default actions
3. **The Engine** evaluates rules in order and resolves the action through a fallback chain
4. **The Adapter** translates the result back into the harness's native blocking mechanism

## Features

### Core Engine
- **Multi-layer matching** — substring pre-filter, structural regex, and adversarial wrapper detection
- **Action fallback chain** — `run → suggest → block` when capabilities are missing
- **Harness capability model** — each adapter declares what behaviors its harness supports
- **YAML rule packs** — author guardrails without writing TypeScript
- **Zero runtime dependencies** — the engine itself is pure logic

### Behaviors
| Behavior | What it does | Phase |
|---|---|---|
| `block` | Stop the tool call, no alternative | before-tool, after-tool |
| `suggest` | Stop the call, offer a safer replacement | before-tool |
| `run` | Execute the replacement in the hook, return output | before-tool |
| `redact` | Allow the call, sanitize output before LLM sees it | after-tool |
| `confirm` | Ask the user (native UI or fallback to suggest) | before-tool |

### Built-in Rule Packs
- **env** — Block `.env` file reads (both file-path and bash commands)
- **private-key** — Block private key access, including SSH directory files
- **secret-managers** — Block 1Password, gopass, pass, and Bitwarden secret retrieval
- **encryption-tools** — Block `age`, `gpg`, and `openssl` decrypt commands
- **sops** — Block SOPS decrypt operations
- **hardening** — Detect shell wrappers (`eval`, `bash -c`, `$()`) and redirects to sensitive paths
- **direnv**, **kubernetes**, **gh-cli** — Platform-specific guardrails

### Adapters
- ✅ **Pi** — native plugin for [Pi](https://github.com/earendil-works/pi)
- ✅ **OpenCode** — native plugin for [OpenCode](https://github.com/anomalyco/opencode)
- 🚧 **Codex** — coming soon
- 🚧 **Claude Code** — coming soon
- 🔌 **Community adapters welcome** — from v0.2.0 onwards, any harness can integrate by implementing a thin adapter shim

## Quick Start

```typescript
import {
  matchAndResolve,
  initializeMatcherRegistry,
  loadAllRulePacks,
} from 'agent-guardrails'

// One-time setup
initializeMatcherRegistry()

const packs = loadAllRulePacks()

const capabilities = {
  block: true,
  suggest: true,
  run: false,
  redact: false,
  confirm: true,
}

// On each tool call:
const action = matchAndResolve(
  { toolName: 'bash', command: 'cat .env' },
  packs,
  capabilities
)

if (action?.type === 'block') {
  console.log(action.message)
  // → "Blocked: `cat .env` — displaying .env file content may leak secrets."
}
```

## Documentation

- [Matching Strategy](docs/matching-strategy.md) — how multi-layer matching works
- [YAML Rule Packs](docs/yaml-rule-packs.md) — author your own rule packs
- [Future Secret Packs](docs/future-secret-packs.md) — backlog of planned rule packs (AWS, Terraform, Vault, etc.)

## Contributing

We welcome rule packs, adapters, and engine improvements. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started — the lowest-friction way to contribute is creating and sharing a YAML rule pack.

## License

MIT — see [LICENSE](LICENSE).
