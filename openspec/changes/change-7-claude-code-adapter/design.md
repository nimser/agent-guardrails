## Context

Claude Code uses shell hooks with exit code protocol. Exit code 2 signals a block, with JSON on stdout providing the reason. This is similar to Codex CLI but simpler (no permissionDecision, just decision).

## Goals / Non-Goals

**Goals:**
- Block dangerous commands via PreToolUse hook
- Suggest safer alternatives when available
- Detect secrets in PostToolUse output
- Provide clear JSON messages

**Non-Goals:**
- `run` behavior (shell hooks cannot execute replacement commands)
- `redact` behavior (PostToolUse cannot modify tool output)
- `confirm` behavior (Claude Code has no native UI)

## Decisions

### Decision 1: Shell hook with jq

**Choice**: Implement guard.sh as a shell script using `jq` for JSON parsing

**Rationale**:
- Claude Code expects shell hooks
- `jq` is widely available
- No runtime dependencies beyond shell and jq
- Can be self-contained single file

### Decision 2: Shared implementation with Codex

**Choice**: Share core logic between Codex and Claude Code adapters

**Rationale**:
- Both use shell hooks with JSON protocol
- Both have similar block/suggest behavior
- Differences are in JSON structure and exit codes
- Build step can generate both variants from shared source

### Decision 3: Exit code 2 for all blocks

**Choice**: Use exit code 2 for both block and suggest

**Rationale**:
- Claude Code protocol uses exit 2 for blocking
- Suggestion is included in the reason field
- Consistent with Claude Code conventions

## Risks / Trade-offs

### Risk: jq not installed
**Mitigation**: Check for jq in setup, provide install instructions

### Risk: Shell script maintenance
**Mitigation**: Generate from TypeScript rules at build time, share with Codex

### Risk: Limited PostToolUse capabilities
**Mitigation**: Use decision/reason to warn about secrets, cannot redact

## Migration Plan

No migration needed - this is a new feature.

## Open Questions

1. Should we share guard.sh between Codex and Claude Code with a wrapper?
2. How to handle complex regex patterns in shell?
