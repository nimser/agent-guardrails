## Context

Agent Guardrails needs a foundation that defines the Behavior model, Rule Pack interface, and Harness Capabilities. This enables consistent implementation across all components.

## Goals / Non-Goals

**Goals:**
- Define clear Behavior vocabulary
- Define GuardrailMatcher discriminated union (bash-command, file-path, predicate)
- Define ToolCallContext discriminated union (on toolName)
- Enable static Rule Pack loading
- Model Harness Capabilities accurately
- Define Phase-Behavior Matrix
- Create engine package with matchAndResolve and fallback chain
- Provide test infrastructure

**Non-Goals:**
- Actual detection logic
- Platform-specific Adapters
- Configuration file loading

## Decisions

### Decision 1: Five Behavior types

**Choice**: `block`, `suggest`, `run`, `redact`, `confirm`

**Rationale**:
- `block`: Universal, works in all Harnesses, all Phases
- `suggest`: Universal, works in all Harnesses, before-tool Phase only
- `run`: opencode/Pi only, requires shell execution Capability
- `redact`: opencode/Pi only, after-tool Phase only, Defense in Depth
- `confirm`: Pi/Codex native, others Fallback to `suggest`

### Decision 2: Phase-based Rule model

**Choice**: Rules have `phase: "before-tool" | "after-tool"`

**Rationale**:
- `before-tool`: Tool Call phase, can block/suggest/run/confirm
- `after-tool`: Tool Result phase, can only redact (for opencode/Pi) or warn (for Claude Code/Codex)
- Clear separation of concerns
- Matches Harness hook APIs
- Phase constrains which Behaviors are available (Phase-Behavior Matrix)

### Decision 3: Static Rule Pack interface

**Choice**: Rule Packs are TypeScript modules with static exports

**Rationale**:
- No dynamic loading complexity
- Easy to test
- Easy to contribute
- Can be published as npm packages later

### Decision 4: Harness Capability model

**Choice**: Explicit Capability flags per Harness

**Rationale**:
- Adapters can check Capabilities before using a Behavior
- Clear documentation of limitations
- Easy to add new Harnesses
- Enables Fallback logic (e.g., `confirm` → `suggest`)

### Decision 5: Action Fallback Chain

**Choice**: Formalized fallback chain in core: `run → suggest → block`, `confirm → suggest`, `suggest (no safer cmd) → block`

**Rationale**:
- Deterministic behavior when Harness lacks Capability
- Adapters don't reinvent fallback logic
- `suggest` gracefully degrades to `block` when no safer command exists
- Testable as a pure function in the engine

### Decision 6: Shared engine package

**Choice**: Create `@agent-guardrails/engine` with `matchAndResolve()` function

**Rationale**:
- Adapters become thin shims (normalize event → call engine → translate result)
- Single source of truth for matching and Action resolution
- Adding new Adapters is trivial
- Centralizes fallback chain logic

### Decision 7: GuardrailMatcher as discriminated union owned by core

**Choice**: Core defines `bash-command`, `file-path`, and `predicate` matcher types

**Rationale**:
- Engine can exhaustively switch on matcher type (compiler-checked)
- Adding a new matcher type forces engine updates
- `predicate` type enables complex matching logic (e.g., SSH directory heuristic) without regex lookahead gymnastics

### Decision 8: ToolCallContext as discriminated union

**Choice**: Discriminated union on `toolName` with strict per-variant fields

**Rationale**:
- Compiler enforces required fields per tool type
- Engine evaluates all matcher types against whatever fields are present
- Adapters just normalize Harness events into this shape

### Decision 9: Contextual message templates

**Choice**: Messages support `{matched}` placeholder interpolated by engine

**Rationale**:
- Agent learns which specific file/command was caught
- More actionable than generic messages
- Single placeholder covers 90% of cases
- Available for all Action types

### Decision 10: Regex is best-effort, document limitations

**Choice**: Regex-only matching for POC, document the gap

**Rationale**:
- Regex is deterministic, fast, testable
- Inherently bypassable via command composition (redirects, string concat, alternative tools)
- `redact` Behavior (change-9) is the backstop for anything that slips through
- Shell tokenizer planned for post-POC for more robust matching

## Risks / Trade-offs

### Risk: Harness Capabilities change
**Mitigation**: Update Capability model, test with real Harnesses

### Risk: Rule Pack interface too rigid
**Mitigation**: Start simple, extend as needed

### Risk: Regex-based matchers are bypassable
**Mitigation**: Regex is best-effort first layer. Shell tokenizer planned post-POC. `redact` Behavior (change-9) is backstop for anything that slips through.

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should Rule Packs be able to declare required Capabilities?
2. How to handle rules that only work in certain phases?
