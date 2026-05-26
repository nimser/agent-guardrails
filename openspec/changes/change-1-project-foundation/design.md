## Context

Agent Guardrails needs a foundation that defines the behavior model, rule pack interface, and harness capabilities. This enables consistent implementation across all components.

## Goals / Non-Goals

**Goals:**
- Define clear behavior vocabulary
- Enable static rule pack loading
- Model harness capabilities accurately
- Provide test infrastructure

**Non-Goals:**
- Actual detection logic
- Platform-specific adapters
- Configuration file loading

## Decisions

### Decision 1: Five behavior types

**Choice**: `block`, `suggest`, `run`, `redact`, `confirm`

**Rationale**:
- `block`: Universal, works everywhere
- `suggest`: Universal fallback when `run` not available
- `run`: opencode/Pi only, better UX (no LLM retry needed)
- `redact`: opencode/Pi only, defense-in-depth
- `confirm`: Pi/Codex native, others fallback to `suggest`

### Decision 2: Phase-based rule model

**Choice**: Rules have `phase: "before-tool" | "after-tool"`

**Rationale**:
- `before-tool`: Pre-hook, can block/suggest/run/confirm
- `after-tool`: Post-hook, can only redact (for opencode/Pi) or warn (for Claude Code/Codex)
- Clear separation of concerns
- Matches harness hook APIs

### Decision 3: Static rule pack interface

**Choice**: Rule packs are TypeScript modules with static exports

**Rationale**:
- No dynamic loading complexity
- Easy to test
- Easy to contribute
- Can be published as npm packages later

### Decision 4: Harness capability model

**Choice**: Explicit capability flags per harness

**Rationale**:
- Adapters can check capabilities before using behavior
- Clear documentation of limitations
- Easy to add new harnesses
- Enables fallback logic (e.g., `confirm` → `suggest`)

## Risks / Trade-offs

### Risk: Harness capabilities change
**Mitigation**: Update capability model, test with real harnesses

### Risk: Rule pack interface too rigid
**Mitigation**: Start simple, extend as needed

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should rule packs be able to declare required capabilities?
2. How to handle rules that only work in certain phases?
