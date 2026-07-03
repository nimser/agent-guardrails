---
status: accepted
---

# ADR-002: Behavior Model & Phase System

## Context

Different AI coding harnesses (Pi, OpenCode, Claude Code, Codex) support different capabilities. The engine needs a consistent vocabulary for _what to do_ when a rule matches, and _when_ it fires — and must fall back gracefully when a harness can't do what the rule asks.

## Decision

### Five Behaviors

| Behavior  | Phase         | What it does                                             | Capability required |
| --------- | ------------- | -------------------------------------------------------- | ------------------- |
| `block`   | before        | Stops tool call with a message                           | None (universal)    |
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
confirm → block
redact → block
suggest → block (when no replacement available)
```

Implemented in `resolveAction()` (`src/resolver/action-resolver.ts`). Adapters just declare their `HarnessCapabilities`; the engine handles the rest.

Every behavior sits on a spectrum of how much autonomous latitude it grants the
agent — `confirm` (a human must explicitly decide) is the *most* restrictive,
`suggest` (the agent gets an actionable replacement it can use with no human
involvement) is far more permissive. A fallback chain only ever moves *toward* more
restriction than the rule author asked for, never past it — which is why `confirm`
falls back straight to `block` rather than to `suggest`: handing the agent an
actionable replacement would invert the intent of a rule that specifically asked for a
human decision. `run → suggest → block` and `suggest → block` are monotonically
restrictive in the same sense. `redact → block` crosses from after-tool to before-tool
when an after-tool sanitize can't be honored — strictly safer than leaking unscrubbed
output, not a phase-crossing anomaly. Because `confirm → block` is the universal
default, ADR-007's `strict` preset needs no special-cased fallback of its own.

**Should-have, not yet implemented:** since `haltTurn` (below) is strictly more
restrictive than plain `block`, the most faithful degradation on a harness that lacks
`confirm` but has `haltTurnBeforeTool` would be `confirm → block+haltTurn → block`.
Worth wiring up once `haltTurn` capabilities are live per-adapter.

### Control-Flow Tiers

`block` and `suggest` sit in the same control-flow tier. Per Claude Code's hook
documentation, a `PreToolUse` deny (`permissionDecision: "deny"` / exit code 2) denies
the call and feeds the reason back to Claude as stderr — **the model's turn continues,
reasoning uninterrupted.** `block` and `suggest` differ only in payload richness
(open-ended "no" vs. "no, try this"), not in who regains control. There are three real
control-flow tiers:

| Tier | Who decides next | Mechanism | Behaviors using it |
| --- | --- | --- | --- |
| **LLM-Continues** | The model, mid-turn, autonomously | deny + reason fed to model | `block`, `suggest` |
| **Human-in-the-loop, call-scoped** | A human, synchronously, for this one call; model resumes immediately after | native permission dialog | `confirm` |
| **Turn Halt** | A human, but the whole turn stops — model isn't reasoning until re-prompted from outside the loop | `haltTurn` modifier, phase- and harness-dependent | `block` + `haltTurn`, `redact` + `haltTurn` |

Do not describe `block` as "stronger" in the sense of halting reasoning — it isn't,
unless paired with `haltTurn`.

### `haltTurn` — an orthogonal, phase-scoped modifier

`haltTurn: boolean` is not a sixth behavior and not a peer of the five behaviors — it's
a modifier restricted to `Block Action` and `Redact Action`:

- **Not available on `Suggest Action`.** `suggest`'s purpose is putting a
  `replacement` in front of the model so it can autonomously retry; `haltTurn` shows
  its message to the human, not the model, so the model never sees the replacement to
  act on. At that point the payload is indistinguishable from `block`'s `message`
  field — there's no scenario `suggest`+`haltTurn` covers that `block`+`haltTurn`
  doesn't.
- **Included on `Redact Action`** because Codex's only halt-capable phase is
  after-tool, and `redact` is the only after-tool behavior — restricting `haltTurn` to
  `Block` alone would make it structurally inexpressible on the one harness that most
  needs an after-tool halt. Concrete use case: output contained a live credential —
  scrub it before the model sees it, and stop the turn because this warrants a human
  looking at how it became readable at all.
- **Not part of `defaultDecision`'s vocabulary** (ADR-007). `defaultDecision` is the
  catch-all for *nothing else matched* — the lowest-confidence case in the system.
  `haltTurn` belongs on high-confidence, specifically-identified adversarial rules,
  not the generic "no rule fired" default.

**Capabilities: phase-scoped, not a flat boolean.** `capabilities.haltTurnBeforeTool:
boolean` and `capabilities.haltTurnAfterTool: boolean` — keeping the flat-boolean
shape `HarnessCapabilities` already uses (no nesting), split by phase because Codex
supports one and not the other. Fallback: when the relevant phase's capability is
`false`, `haltTurn: true` degrades to the plain behavior with no halt — silently
dropped, not erroring, same posture as other capability degradation in this ADR.

**Named `haltTurn`, not `haltSession`.** Confirmed against the runtime source of Pi
and OpenCode, the Rust source of Codex, and Claude Code's hook documentation: every
harness's version of this mechanism stops the current turn/run, not the persistent,
multi-turn session/conversation. Claude Code's `continue:false` stops "processing" for
that turn; Pi's `ctx.abort()` calls `AgentSession.abort()`, which stops the current
streaming turn (the session object and history persist); OpenCode's
`client.session.abort()` calls `promptSvc.cancel(sessionID)`, cancelling the active
runner for that session, not the session itself.

**Per-harness capability, verified at source level** (same standard `tamperResistant`,
ADR-007, requires for every adapter capability claim):

| Harness | Mechanism | Architecture | `haltTurnBeforeTool` | `haltTurnAfterTool` |
| --- | --- | --- | --- | --- |
| Claude Code | declarative `continue:false`/`stopReason` in hook JSON output | out-of-process (subprocess, stdin/stdout/exit-code only) | `true` | `true` |
| Codex | declarative `continue:false`/`stopReason` in hook JSON output | out-of-process (subprocess) | `false` — structurally rejected, see below | `true` |
| Pi | imperative `ctx.abort()` on `ExtensionContext` | in-process plugin (live reference to running session) | `true` | `true` |
| OpenCode | imperative `client.session.abort()` via the SDK client every plugin receives | in-process plugin (HTTP client to own server, same process/lifecycle) | `true` | `true` |

Pi and OpenCode support `haltTurn` despite no declarative field in their hook return
types because both are in-process plugins holding a live handle into the running
agent — an imperative escape hatch independent of what a specific event's declared
return type supports. Claude Code and Codex hooks are out-of-process subprocesses
whose *only* channel back is the declared JSON schema — if that schema has no stop
field for a phase, there is no other way to signal it. This is the same
in-process/out-of-process split that determines `tamperResistant` (ADR-007).

**Codex's before-tool exclusion is deliberate, confirmed at the Rust source level:**
`codex-rs/hooks/src/events/pre_tool_use.rs`'s `PreToolUseOutcome` has no
continue/stop field at all (`should_block`, `block_reason`, `updated_input` only); a
dedicated test, `unsupported_permission_decision_fails_open`, asserts that a hook
attempting `permissionDecision:"ask"` on `PreToolUse` is rejected and **fails open**
(tool call proceeds anyway). `PostToolUse` (`post_tool_use.rs`) genuinely supports
`continue`/`stopReason` (tested: `continue_false_stops_with_reason`).

**Rejected: routing Codex's before-tool halt through the after-tool hook via input
substitution.** `codex-rs/core/src/tools/registry.rs` shows that when `PreToolUse`
returns `Blocked`, the registry returns an error immediately and the tool never
executes — `PostToolUse` is gated on the tool having actually run and succeeded, so
there's no "after" to hook into once `PreToolUse` denies a call. The only theoretical
workaround — use `updatedInput` to rewrite the command into a fabricated no-op, let it
"succeed," then issue `continue:false` from `PostToolUse` — was rejected: it stops
being `block`+`haltTurn` and becomes `run`+`haltTurn` on the after-tool phase (a
substitution, not a denial); it requires synthesizing a plausible no-op for every rule
wanting this (no natural no-op exists for "block `eval`"); and it produces a
misleading transcript (a "successful" call the model never really got to make) for one
harness's one edge case. **Decision: don't build it.** Codex declares
`haltTurnBeforeTool: false` and behaves like any other harness without before-tool
halt support — plain `block`, no halt. Recorded as a rejected idea in
`future-architecture-decisions.md`, not silently dropped.

**Concrete use case:** `haltTurn: true` on the `hardening` pack's Layer 3
adversarial-wrapper rules (`eval`, `bash -c`, `$()`, backticks) specifically, leaving
ordinary secret-pattern rules (env, sops, private-key) as LLM-continues. An adversarial
wrapper attempt is exactly the case where letting the model "adapt and retry" is the
wrong response — it might be the injection trying another wrapper shape in the same
turn. Ordinary accidental misuse (agent `cat`s `.env` "just to see setup") stays
LLM-continues; halting the turn on every secret-pattern match would be exhausting and
isn't what the fail-open-by-default rationale (ADR-007) argues for.

### `block`'s Mechanism Is Per-Adapter

`block` is universal in *outcome* — every adapter can deny a call with no capability
check — but not in *mechanism*. Each adapter achieves it differently:

| Adapter | How `block` is achieved |
| --- | --- |
| Claude Code | declarative `permissionDecision: "deny"` / exit code 2 in hook JSON |
| Codex | declarative `continue:false`/`should_block` in hook JSON |
| Pi | `{ block: true, reason }` return value |
| OpenCode | throw inside `tool.execute.before` (throw-to-deny) — its hook signature (`(input, output: { args: any }) => Promise<void>`) has no `block`/`deny` field; denial works by throwing inside the hook, which the surrounding Effect pipeline turns into a failed tool-execution effect |

Each adapter's `spec.md` states its mechanism plainly rather than treating it as
uniform just because the outcome is.

### Contextual Messages

All action messages support `{matched}` template interpolation, replaced at match time with the actual command or file path that triggered the rule. This tells the agent _what_ was caught, not just that something was caught.

### Mediation Scope

The project does not and cannot guarantee containment against an adversarial agent
(`SECURITY.md` already concedes this) — the behavior model is not, and should not be
described as, a security boundary. **The scope decision:** built-in rule packs stay
safety/secrets-focused (env, private keys, secret managers, encryption tools,
hardening), but the mechanism — `Rule`, `Rule Pack`, `Behavior`,
`block`/`suggest`/`run`/`redact`/`confirm`, `Match Condition` — is general-purpose by
construction. Community packs may use it for non-security steering (style nudges,
workflow guardrails, cost control) without that requiring a project position change.
Internal vocabulary is unaffected by this — these are mechanism names, not brand
claims, and don't need renaming. The outward-facing claim is: this reduces the
operational drag of running coding agents (fewer leaked-secret rotations, fewer wasted
turns on dead-end commands, an agent that adapts instead of hitting a wall), with
safety-shaped wins as the proof-of-value wedge, not the ceiling of the pitch. See
`docs/adrs/008-non-goals.md` for what this project deliberately does not chase.

## Rationale

- **Universality first:** `block` and `suggest` work in every harness
- **Graceful degradation:** Fallback chains mean adapters never duplicate logic
- **Learnability:** `{matched}` makes blocked actions self-explanatory
- **Fail-fast validation:** Phase-behavior mismatches caught at load time, not at runtime

## Consequences

- Rules using `redact` in `before-tool` are rejected at load time
- Adapters only declare capabilities; fallback is automatic
- Adding a new behavior or phase requires updating the phase-behavior matrix and `validateRule()` together
- `confirm`'s fallback chain (`confirm → block`) never hands autonomy to the agent on the one behavior meant to require a human
- `haltTurn` requires two capability flags (`haltTurnBeforeTool`, `haltTurnAfterTool`) every adapter's `spec.md` must declare, verified at source level, not from vendor docs alone
- Codex cannot support `haltTurn` on `before-tool` — adapters must handle this as a plain, unmodified `block`, not attempt a `run`+`haltTurn` substitution workaround
- Each adapter's `spec.md` documents its own `block` mechanism explicitly (declarative field, return value, or throw-to-deny) rather than assuming a uniform mechanism
