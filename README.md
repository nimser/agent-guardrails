# Guiderails

> **⚠️ Early release:** APIs may change before 1.0.

---

[![npm](https://img.shields.io/npm/v/guiderails.svg)](https://www.npmjs.com/package/guiderails)
[![Build](https://img.shields.io/github/actions/workflow/status/nimser/guiderails/ci.yml?branch=main)](https://github.com/nimser/guiderails/actions)
[![Coverage](https://img.shields.io/codecov/c/github/nimser/guiderails)](https://codecov.io/gh/nimser/guiderails)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/guiderails)](https://bundlephobia.com/package/guiderails)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<!-- SonarCloud -->

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nimser_guiderails&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nimser_guiderails)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=nimser_guiderails&metric=coverage)](https://sonarcloud.io/summary/new_code?id=nimser_guiderails)

<!-- /SonarCloud -->

Your agent just tried `cat .env`. It got back the keys — not the values — and kept working.

<!-- TODO: terminal GIF — `cat .env` → suggest → redacted read, one uninterrupted agent turn -->

That's the whole idea: a steering layer for AI coding agents. Instead of stopping the agent cold, rules hand it a safer or better move it can act on immediately — `suggest` a redacted read, `run` a rewritten command, `redact` a leaked value, `confirm` with a human, or `block` when nothing safe exists.

## Batteries included

Rules work out of the box — no config, no flags:

```bash
npm install guiderails
```

Using [Pi](https://github.com/earendil-works/pi)? Register the extension and you're done:

```typescript
import piGuiderails from "guiderails/adapters/pi";

export default piGuiderails;
```

Try `cat .env` in your agent — it comes back with a redacted read instead of the raw file. A stricter posture is on the roadmap: `--strict` will confirm-gate anything secret-shaped even without a specific rule and lock the `hardening` pack on ([ADR-007](docs/adrs/007-trust-and-self-protection.md)).

## Two doors (a third on the roadmap)

- **Pi plugin** — in-process, ships today. Register as shown above ([adapter docs](src/adapters/pi/README.md)).
- **TypeScript library** — building your own harness? `npm install guiderails`, one function:

  ```typescript
  import { createEngine, loadAllRulePacks } from "guiderails";

  const engine = createEngine(loadAllRulePacks("./packs", registry), capabilities);
  const action = engine.evaluate(ctx); // per tool call / tool result / user prompt
  ```

- **Claude Code hooks** — on the roadmap; not shipped yet.

## Rule packs

**Security** — fires rarely, saves your week when it does:

| Pack               | What it does                                                            |
| ------------------ | ------------------------------------------------------------------------ |
| `env`              | `.env` reads come back redacted — keys visible, values gone             |
| `sops`             | `sops -d` swapped for a format-aware redacted pipe                      |
| `private-key`      | `.pem`, `.key`, SSH key reads blocked                                   |
| `secret-managers`  | `pass show`, `op read`, `gopass`, `bw get` blocked — nothing safe to transform into |
| `encryption-tools` | `age -d`, `gpg --decrypt`, `openssl enc -d` blocked                     |
| `hardening`        | shell wrappers (`eval`, `bash -c`, `$()`) around risky commands force-blocked |

Status: the packs above are the v0.1.0 shipping set; anything not listed here doesn't exist yet and isn't claimed. Steering packs (`modern-cli`, `package-manager`, `git-safety`) are on the roadmap.

Every boundary where a secret can cross into the model's context is mediated: **user input** (a key pasted into the prompt is scrubbed before it reaches the API), **tool calls**, and **tool output**.

## How it works

```
Agent Tool Call → Match Rules → Resolve Action → Enforce
      ↓               ↓             ↓                   ↓
ToolCallContext   Rule Packs   GuardrailAction   Harness Specific
               (YAML)       + Fallback Chain      Behaviour
```

Rules are YAML (plus TypeScript predicates for complex logic). Each adapter declares what its harness can do (`HarnessCapabilities`); when a capability is missing, the engine degrades deterministically (`run → suggest → block`, `confirm → block`, `redact → block`) — declared, never silent. Details in the [ADRs](docs/adrs/).

## Trust & self-protection

- Built-in rules can be locked (`overridable: false`) so no user config softens them; community packs can't claim that privilege.
- Unmatched calls fail **open** (the agent keeps working); an engine crash fails **closed** (`block`), unconditionally, on every adapter.
- Whether the layer runs somewhere the agent could tamper with it is a declared per-adapter fact (`tamperResistant`), not a hand-wave.

See [ADR-007](docs/adrs/007-trust-and-self-protection.md) and [LIMITATIONS.md](LIMITATIONS.md).

## Adapters

- **Pi** — first-party, in-process plugin for [Pi](https://github.com/earendil-works/pi)
- **Claude Code** — first-party, external hooks (roadmap)
- **Community adapters welcome** — any harness integrates against the stable adapter interface ([ADR-009](docs/adrs/009-adapter-scope-and-tiering.md), [ADR-003](docs/adrs/003-public-api-contract.md))

## Documentation

- [Getting Started](docs/getting-started.md) — install, capability table, embedding quickstart, architecture
- [Rule Pack Guide](docs/rule-pack-guide.md) — complete YAML format spec with steering and security examples
- [Pack Gallery](docs/packs.md) — every shipped pack and rule, auto-generated
- [How Matching Works](docs/how-matching-works.md) — layer-by-layer walkthrough
- [ADRs](docs/adrs/) — the _why_ behind core design choices
- [LIMITATIONS.md](LIMITATIONS.md) · [SECURITY.md](SECURITY.md)

## Contributing

We welcome rule packs, community adapters, and engine improvements. See [CONTRIBUTING.md](CONTRIBUTING.md) — the lowest-friction contribution is a YAML rule pack.

## License

MIT — see [LICENSE](LICENSE).

---

A steering layer, not a sandbox — pair with [agentjail](https://github.com/LuD1161/agentjail) for containment.
