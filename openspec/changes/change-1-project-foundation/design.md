## Context

Agent Guardrails needs a foundation that defines the Behavior model, Rule Pack interface, and Harness Capabilities. This enables consistent implementation across all components.

## Goals / Non-Goals

**Goals:**
- Define clear Behavior vocabulary
- Enable static Rule Pack loading
- Model Harness Capabilities accurately
- Define Phase-Behavior Matrix
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

## Risks / Trade-offs

### Risk: Harness Capabilities change
**Mitigation**: Update Capability model, test with real Harnesses

### Risk: Rule Pack interface too rigid
**Mitigation**: Start simple, extend as needed

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should Rule Packs be able to declare required Capabilities?
2. How to handle rules that only work in certain phases?
