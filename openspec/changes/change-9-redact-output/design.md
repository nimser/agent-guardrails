## Context

PostToolUse (Tool Result) redaction is Defense in Depth that catches secrets in Tool Output. Only works in opencode and Pi.

## Goals / Non-Goals

**Goals:**
- Detect secrets in Tool Output
- Replace with descriptive markers
- Work in opencode and Pi

**Non-Goals:**
- Claude Code/Codex (can't modify Output)
- PreToolUse blocking (covered elsewhere)

## Decisions

### Decision 1: Descriptive markers
**Choice**: `[REDACTED: {rule_title}]` format
**Rationale**: Agent knows what was removed, can reason about context

### Decision 2: Only risky commands
**Choice**: Only scan Output from commands that matched pre-hook Rules
**Rationale**: Performance - scanning all Output is expensive

## Risks / Trade-offs

### Risk: Misses secrets
**Mitigation**: Defense in Depth, primary defense is blocking

### Risk: Performance
**Mitigation**: Only scan risky command Output
