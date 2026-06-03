---
status: accepted
---

# ADR-002: Behavior Model & Phase System

## Context

Different AI coding harnesses (Pi, OpenCode, Claude Code, Codex) support different capabilities. The engine needs a consistent vocabulary for *what to do* when a rule matches, and *when* it fires — and must fall back gracefully when a harness can't do what the rule asks.

## Decision

### Five Behaviors

| Behavior  | Phase         | What it does                                             | Capability required |
| --------- | ------------- | -------------------------------------------------------- | ------------------- |
| `block`   | before, after | Stops tool call with a message                           | None (universal)    |
| `suggest` | before        | Stops call, offers a safer replacement                   | None (universal)    |
| `run`     | before        | Stops call, executes replacement in-hook, returns output | `run`               |
| `redact`  | after         | Allows call, sanitizes output before LLM sees it         | `redact`            |
| `confirm` | before        | Prompts user for approval                                | `confirm`           |

`block` and `suggest` work everywhere — they're the safe baseline any adapter can rely on.

### Phase-Behavior Constraints

- `before-tool` → block, suggest, run, confirm
- `after-tool` → redact only

This is a hard constraint enforced at pack load time by `validateRule()` (`src/core/validator.ts`). Invalid combinations fail fast with a clear error message.

### Fallback Chain

When a harness lacks a capability, the engine walks a deterministic fallback:

```
run → suggest → block
confirm → suggest → block
redact → block
suggest → block (when no replacement available)
```

Implemented in `resolveAction()` (`src/resolver/action-resolver.ts`). Adapters just declare their `HarnessCapabilities`; the engine handles the rest.

### Contextual Messages

All action messages support `{matched}` template interpolation, replaced at match time with the actual command or file path that triggered the rule. This tells the agent *what* was caught, not just that something was caught.

## Rationale

- **Universality first:** `block` and `suggest` work in every harness
- **Graceful degradation:** Fallback chains mean adapters never duplicate logic
- **Learnability:** `{matched}` makes blocked actions self-explanatory
- **Fail-fast validation:** Phase-behavior mismatches caught at load time, not at runtime

## Consequences

- Rules using `redact` in `before-tool` are rejected at load time
- Adapters only declare capabilities; fallback is automatic
- Adding a new behavior or phase requires updating the phase-behavior matrix and `validateRule()` together
