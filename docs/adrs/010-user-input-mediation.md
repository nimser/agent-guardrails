---
status: accepted
---

# ADR-010: User-Input Mediation (`user-input` phase)

## Context

Tool-call mediation covers what the model does and what it reads back — but not what the user types. An API key pasted into a prompt goes straight to the provider's API and its logs; no tool call is involved, so `before-tool`/`after-tool` rules never see it. Both Tier 1 harnesses expose an interception point for this: Claude Code's `UserPromptSubmit` hook, and Pi's in-process input pipeline.

## Decision

`user-input` is the third phase alongside `before-tool` and `after-tool`. Rules in this phase match against the prompt text the user submitted, before it reaches the provider API.

### Phase-behavior matrix

| Behavior  | `user-input` | Semantics in this phase                                        |
| --------- | ------------ | -------------------------------------------------------------- |
| `redact`  | ✅           | Rewrite the prompt — secret shapes replaced with placeholders — and submit the scrubbed version |
| `block`   | ✅           | Reject the prompt with a message; nothing reaches the API      |
| `confirm` | ✅           | Ask the user whether to submit as-is                           |
| `suggest` | ❌           | A tool-call concept — there is no "replacement command" for a prompt; the redacted rewrite _is_ the steer |
| `run`     | ❌           | A tool-call concept — nothing to execute                       |

Fallbacks follow ADR-002's monotonic-restriction principle: `redact → block` and `confirm → block` when the harness lacks the capability.

### Capability

`HarnessCapabilities` carries `redactUserInput: boolean` — whether the harness can rewrite the submitted prompt (as opposed to only blocking it). Pi: `true` (in-process interception). Claude Code: `true` (`UserPromptSubmit` structured output).

### Context shape

The engine receives a `ToolCallContext`-compatible context with `phase: "user-input"` and the prompt text as the match target. Bash-command matchers don't apply; substring, regex, and predicate matchers do.

## Rationale

- **Completes the boundary story.** With this phase the project mediates every boundary where a secret can cross into the model's context: user input, tool calls, tool output.
- **Small lift.** One more event type through the same engine, matchers, and resolver — no new architecture.
- **Underserved surface.** Tool-output scrubbing is widely built; scrubbing what the user pastes in is not, despite being the most common accidental leak path.

## Consequences

- `validateRule()` enforces the `user-input` phase-behavior matrix at pack load time.
- Both Tier 1 adapters wire the phase: Claude Code via `UserPromptSubmit`, Pi via input interception.
- Secret-pattern rule packs can declare `user-input` rules reusing the same match conditions as their `after-tool` redaction rules.
- This is a hygiene layer for accidental pastes, not a data-loss-prevention guarantee (ADR-008, LIMITATIONS.md).
