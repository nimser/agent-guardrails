## Context

Interactive confirmation enhances UX by letting users approve risky operations. Only Pi and Codex have native support.

## Goals / Non-Goals

**Goals:**
- Native confirmation in Pi and Codex
- Fallback to suggest for Claude Code/opencode

**Non-Goals:**
- Core safety (covered by blocking/transforms)
- Redaction (covered elsewhere)

## Decisions

### Decision 1: Fallback to suggest
**Choice**: Claude Code/opencode fall back to `suggest`
**Rationale**: No native UI available, `suggest` is closest behavior

## Risks / Trade-offs

### Risk: Fallback confusing
**Mitigation**: Clear messages
