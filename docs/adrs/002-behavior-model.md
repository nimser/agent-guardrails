---
status: accepted
---

# ADR-002: Behavior Model & Phase System

## Context

The engine needs a consistent vocabulary for _what to do_ when a rule matches and _when_ it fires, and it must degrade gracefully when a harness can't do what the rule asks. Harnesses are unequal by construction — Pi is an in-process plugin with a live handle into the running session; Claude Code is an out-of-process hook subprocess whose only channel back is a declared JSON schema. The behavior model has to make one rule vocabulary portable across that asymmetry.

## Decision

### Five Behaviors

| Behavior  | Phase                     | What it does                                             | Capability required |
| --------- | ------------------------- | -------------------------------------------------------- | ------------------- |
| `block`   | before-tool, user-input   | Stops the tool call (or prompt) with a message           | None (universal)    |
| `suggest` | before-tool               | Stops call, offers a safer replacement                   | None (universal)    |
| `run`     | before-tool               | Rewrites the call to a safer equivalent and lets it run  | `run`               |
| `redact`  | after-tool, user-input    | Sanitizes content before the model sees it               | `redact` / `redactUserInput` |
| `confirm` | before-tool, user-input   | Prompts user for approval                                | `confirm`           |

`block` and `suggest` work everywhere — they're the safe baseline any adapter can rely on.

### Three Phases

| Phase         | Boundary mediated                                        | Allowed behaviors                  |
| ------------- | -------------------------------------------------------- | ---------------------------------- |
| `user-input`  | What the user pastes into the prompt, before it reaches the provider API | `redact`, `block`, `confirm` |
| `before-tool` | The tool call the model is about to make                 | `block`, `suggest`, `run`, `confirm` |
| `after-tool`  | The tool output the model is about to read               | `redact`                           |

Together the three phases mediate every boundary where a secret can cross into the model's context: user input, tool calls, tool output. `suggest` and `run` are tool-call concepts — they presuppose a command to replace — and are excluded from `user-input` (see ADR-010).

This is a hard constraint enforced at pack load time by `validateRule()` (`src/core/validator.ts`). Invalid combinations fail fast with a clear error message.

### Fallback Chain

When a harness lacks a capability, the engine walks a deterministic fallback:

```
run → suggest → block
confirm → block
redact → block
suggest → block (when no replacement available)
```

Implemented in `resolveAction()` (`src/resolver/action-resolver.ts`). Adapters just declare their `HarnessCapabilities`; the engine handles the rest.

Every behavior sits on a spectrum of how much autonomous latitude it grants the agent — `confirm` (a human must explicitly decide) is the _most_ restrictive, `suggest` (the agent gets an actionable replacement it can use with no human involvement) is far more permissive. A fallback chain only ever moves _toward_ more restriction than the rule author asked for, never past it — which is why `confirm` falls back straight to `block` rather than to `suggest`: handing the agent an actionable replacement would invert the intent of a rule that specifically asked for a human decision. `run → suggest → block` and `suggest → block` are monotonically restrictive in the same sense. `redact → block` crosses from after-tool to before-tool when an after-tool sanitize can't be honored — strictly safer than leaking unscrubbed output, not a phase-crossing anomaly. Because `confirm → block` is the universal default, ADR-007's `strict` preset needs no special-cased fallback of its own.

The fallback chains justify themselves across exactly two unequal harnesses: in-process (Pi) versus out-of-process (Claude Code) is the asymmetry the capability model exists for. A community adapter for a harness with a thinner hook surface plugs into the same chains without engine changes (ADR-009).

### Capability Table — Tier 1 Adapters

| Capability            | Pi (in-process plugin) | Claude Code (external hooks) |
| --------------------- | ---------------------- | ---------------------------- |
| `block`               | ✅ `{ block: true, reason }` return | ✅ `permissionDecision: "deny"` |
| `suggest`             | ✅ block + reason fed to model | ✅ deny + reason fed to model |
| `run`                 | ✅ in-process execution | ✅ PreToolUse `updatedInput` |
| `redact`              | ✅ `tool_result` override | ✅ PostToolUse `updatedToolOutput` — **version floor ≥ 2.1.121**; below it, `redact → block` |
| `confirm`             | ✅ `ctx.ui.confirm()` TUI dialog | ✅ `permissionDecision: "ask"` |
| `redactUserInput`     | ✅ in-process input interception | ✅ `UserPromptSubmit` hook |
| `haltTurnBeforeTool`  | ✅ `ctx.abort()`        | ✅ `continue: false`         |
| `haltTurnAfterTool`   | ✅ `ctx.abort()`        | ✅ `continue: false`         |
| `tamperResistant`     | ❌ in-process (ADR-007) | ✅ out-of-process (ADR-007)  |

Claude Code binds all five behaviors natively — no emulation needed. Pi binds them in-process with a live session handle. Community adapters (ADR-009) declare the same flags for their harness; the engine's fallback chains cover whatever is `false`.

### Control-Flow Tiers

`block` and `suggest` sit in the same control-flow tier. A `PreToolUse` deny feeds the reason back to the model — **the model's turn continues, reasoning uninterrupted.** `block` and `suggest` differ only in payload richness (open-ended "no" vs. "no, try this"), not in who regains control. There are three real control-flow tiers:

| Tier | Who decides next | Mechanism | Behaviors using it |
| --- | --- | --- | --- |
| **LLM-Continues** | The model, mid-turn, autonomously | deny + reason fed to model | `block`, `suggest` |
| **Human-in-the-loop, call-scoped** | A human, synchronously, for this one call; model resumes immediately after | native permission dialog | `confirm` |
| **Turn Halt** | A human, but the whole turn stops — model isn't reasoning until re-prompted from outside the loop | `haltTurn` modifier | `block` + `haltTurn`, `redact` + `haltTurn` |

Do not describe `block` as "stronger" in the sense of halting reasoning — it isn't, unless paired with `haltTurn`.

### `haltTurn` — an orthogonal, phase-scoped modifier

`haltTurn: boolean` is not a sixth behavior and not a peer of the five behaviors — it's a modifier restricted to `Block Action` and `Redact Action`:

- **Not available on `Suggest Action`.** `suggest`'s purpose is putting a `replacement` in front of the model so it can autonomously retry; `haltTurn` shows its message to the human, not the model, so the model never sees the replacement to act on. At that point the payload is indistinguishable from `block`'s `message` field.
- **Available on `Redact Action`** for the case where output contained a live credential — scrub it before the model sees it, and stop the turn because this warrants a human looking at how it became readable at all.
- **Not part of `defaultDecision`'s vocabulary** (ADR-007). `defaultDecision` is the catch-all for _nothing else matched_ — the lowest-confidence case in the system. `haltTurn` belongs on high-confidence, specifically-identified adversarial rules, not the generic "no rule fired" default.

**Capabilities: phase-scoped, not a flat boolean.** `capabilities.haltTurnBeforeTool: boolean` and `capabilities.haltTurnAfterTool: boolean` — flat booleans like the rest of `HarnessCapabilities`, split by phase because a harness's hook schema may support a stop signal in one phase and not the other. Fallback: when the relevant phase's capability is `false`, `haltTurn: true` degrades to the plain behavior with no halt — silently dropped, not erroring, same posture as other capability degradation in this ADR.

**Named `haltTurn`, not `haltSession`.** Verified against harness sources: every harness's version of this mechanism stops the current turn/run, not the persistent multi-turn session. Claude Code's `continue: false` stops processing for that turn; Pi's `ctx.abort()` calls `AgentSession.abort()`, which stops the current streaming turn (the session object and history persist).

**Concrete use case:** `haltTurn: true` on the `hardening` pack's Layer 3 adversarial-wrapper rules (`eval`, `bash -c`, `$()`, backticks) specifically, leaving ordinary secret-pattern rules (env, sops, private-key) as LLM-continues. An adversarial wrapper attempt is exactly the case where letting the model "adapt and retry" is the wrong response — it might be the injection trying another wrapper shape in the same turn. Ordinary accidental misuse (agent `cat`s `.env` "just to see setup") stays LLM-continues; halting the turn on every secret-pattern match would be exhausting and isn't what the fail-open-by-default rationale (ADR-007) argues for.

### `block`'s Mechanism Is Per-Adapter

`block` is universal in _outcome_ — every adapter can deny a call with no capability check — but not in _mechanism_:

| Adapter | How `block` is achieved |
| --- | --- |
| Pi | `{ block: true, reason }` return value from the `tool_call` hook |
| Claude Code | declarative `permissionDecision: "deny"` in structured hook JSON output |

Each adapter's spec states its mechanism plainly rather than treating it as uniform just because the outcome is. Community adapters document theirs the same way (ADR-009).

### Contextual Messages

All action messages support `{matched}` template interpolation, replaced at match time with the actual command or file path that triggered the rule. This tells the agent _what_ was caught, not just that something was caught.

### Mediation Scope

The project does not and cannot guarantee containment against an adversarial agent (`LIMITATIONS.md`) — the behavior model is not, and should not be described as, a security boundary (ADR-008). **The scope decision:** the mechanism — `Rule`, `Rule Pack`, `Behavior`, `block`/`suggest`/`run`/`redact`/`confirm`, `Match Condition` — is general-purpose by construction, and the shipped packs use it that way: steering (QoL) packs that fire every session (`grep` → `rg`, package-manager mismatch, protected-branch commits) alongside security packs (env, sops, private keys, secret managers, hardening). The outward-facing claim is: this reduces the operational drag of running coding agents — fewer leaked-secret rotations, fewer wasted turns on dead-end commands, an agent that adapts instead of hitting a wall. See ADR-008 for what this project deliberately does not chase.

## Rationale

- **Universality first:** `block` and `suggest` work in every harness
- **Graceful degradation:** Fallback chains mean adapters never duplicate logic
- **Complete boundary coverage:** three phases mediate every point where a secret can cross into the model's context
- **Learnability:** `{matched}` makes blocked actions self-explanatory
- **Fail-fast validation:** Phase-behavior mismatches caught at load time, not at runtime

## Consequences

- Rules using `redact` in `before-tool`, or `suggest`/`run` in `user-input`, are rejected at load time
- Adapters only declare capabilities; fallback is automatic
- Adding a new behavior or phase requires updating the phase-behavior matrix and `validateRule()` together
- `confirm`'s fallback chain (`confirm → block`) never hands autonomy to the agent on the one behavior meant to require a human
- The Claude Code adapter declares `redact` with a version floor of 2.1.121 and degrades `redact → block` below it
- Each adapter's spec documents its own `block` mechanism explicitly rather than assuming a uniform mechanism
