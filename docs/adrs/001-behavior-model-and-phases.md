---
status: accepted
decisions: [1, 2, 5, 10]
ref: openspec/changes/change-1-project-foundation/design.md (internal use only)
---

# ADR-001: Behavior Model & Phase System

## Context

Guardrail rules need a consistent vocabulary for _what to do_ when they match, and _when_ they fire. Different AI coding harnesses (Pi, OpenCode, Claude Code, Codex) support different capabilities, so the engine must express intents generatively and fall back gracefully when a harness lacks a capability.

## Decision

### Behaviors

Five behaviors, each with clear semantics:

| Behavior  | Phase         | What it does                                             | Capability required |
| --------- | ------------- | -------------------------------------------------------- | ------------------- |
| `block`   | before, after | Stops tool call with a message                           | None (universal)    |
| `suggest` | before        | Stops call, offers a safer replacement                   | None (universal)    |
| `run`     | before        | Stops call, executes replacement in-hook, returns output | `run`               |
| `redact`  | after         | Allows call, sanitizes output before LLM sees it         | `redact`            |
| `confirm` | before        | Prompts user for approval                                | `confirm`           |

### Phase-Behavior Constraints

- `before-tool` → block, suggest, run, confirm
- `after-tool` → redact only

This is not a UI preference — it's a hard constraint enforced by `validateRule()` (see `src/core/validator.ts`).

### Fallback Chain

When a harness lacks a capability, the engine walks a deterministic fallback:

```
run → suggest → block
confirm → suggest → block
redact → block
suggest → block (when no replacement available)
```

Implemented in `src/resolver/action-resolver.ts` via `resolveAction()`.

### Contextual Messages

All action messages support `{matched}` template interpolation, replaced at match time with the actual command or file path that triggered the rule. The resolver also interpolates `{replacement}` in messages.

### Rationale

- **Universality first:** `block` and `suggest` work everywhere, providing a safe baseline for new harnesses
- **Graceful degradation:** Fallback chains mean adapters never need duplicate logic — the engine handles it
- **Learnability:** `{matched}` tells the agent _what_ was caught, not just that something was caught
- **Phase constraints** enforced at validation time prevent silent misconfiguration

## Consequences

- Rules cannot use `redact` in `before-tool` — validation rejects it
- Adapters only need to declare `HarnessCapabilities`; fallback is automatic
- Future behaviors or phases must update the Phase-Behavior matrix and validation logic together
