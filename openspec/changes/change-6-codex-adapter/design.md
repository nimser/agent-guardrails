## Context

Codex CLI uses shell hooks that communicate via JSON protocol. Hooks receive JSON on stdin and output JSON on stdout. This is different from Pi/opencode which use in-process extensions.

## Goals / Non-Goals

**Goals:**
- Block dangerous commands via PreToolUse hook (Tool Call)
- Suggest safer alternatives when available
- Detect secrets in PostToolUse Output (Tool Result)
- Provide clear Messages in JSON

**Non-Goals:**
- `run` Behavior (shell hooks cannot execute Replacement commands)
- `redact` Behavior (PostToolUse cannot modify Tool Output)
- `confirm` Behavior (comes in change-10-interactive-confirmation)

## Decisions

### Decision 1: Shell hook with jq

**Choice**: Implement guard.sh as a shell script using `jq` for JSON parsing

**Rationale**:
- Codex CLI expects shell hooks
- `jq` is widely available
- No runtime dependencies beyond shell and jq
- Can be self-contained single file

### Decision 2: Embedded Rule matching

**Choice**: Embed Rule patterns (Guardrail Matchers) directly in shell script (compiled from TypeScript)

**Rationale**:
- Avoids Node.js dependency at runtime
- Shell script is self-contained
- Patterns are static and don't change at runtime
- Build step compiles TypeScript Rules to shell patterns

### Decision 3: deny + reason for block/suggest

**Choice**: Use `permissionDecision: deny` with `permissionDecisionReason` for both block and suggest

**Rationale**:
- Codex CLI protocol uses `permissionDecision` for blocking
- Suggestion (Replacement) can be included in the reason (Message)
- Consistent with Codex conventions

## Risks / Trade-offs

### Risk: jq not installed
**Mitigation**: Check for jq in setup, provide install instructions

### Risk: Shell script maintenance
**Mitigation**: Generate from TypeScript rules at build time

### Risk: Limited PostToolUse capabilities
**Mitigation**: Use `additionalContext` to warn about secrets, cannot redact

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we bundle jq or require it as a prerequisite?
2. How to handle complex regex patterns in shell?
