## Context

PostToolUse redaction is defense-in-depth that catches secrets in tool output. Only works in opencode and Pi.

## Goals / Non-Goals

**Goals:**
- Detect secrets in tool output
- Replace with descriptive markers
- Work in opencode and Pi

**Non-Goals:**
- Claude Code/Codex (can't modify output)
- PreToolUse blocking (covered elsewhere)

## Decisions

### Decision 1: Descriptive markers
**Choice**: `[REDACTED: {rule_title}]` format
**Rationale**: Agent knows what was removed, can reason about context

### Decision 2: Only risky commands
**Choice**: Only scan output from commands that matched pre-hook rules
**Rationale**: Performance - scanning all output is expensive

## Risks / Trade-offs

### Risk: Misses secrets
**Mitigation**: Defense-in-depth, primary defense is blocking

### Risk: Performance
**Mitigation**: Only scan risky command output
